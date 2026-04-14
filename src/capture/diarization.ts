import { exec } from "child_process";
import { promisify } from "util";
import { readFile, writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { logger } from "../logger.js";
import type { TranscriptSegment } from "./audio.js";

const execAsync = promisify(exec);

/**
 * Speaker diarization: identifies WHO said WHAT in a meeting.
 *
 * Uses a Python subprocess with pyannote.audio or whisperx for
 * speaker identification. Falls back to unlabeled segments if
 * pyannote is not installed.
 *
 * Requirements:
 * - pip install pyannote.audio (or whisperx)
 * - Hugging Face token for pyannote models
 *
 * The diarization enriches TranscriptSegment.speaker field.
 */

export class SpeakerDiarizer {
  private hfToken: string | undefined;

  constructor(options?: { huggingFaceToken?: string }) {
    this.hfToken = options?.huggingFaceToken ?? process.env.HF_TOKEN;
  }

  /**
   * Add speaker labels to transcript segments.
   * Modifies segments in-place by setting .speaker field.
   */
  async diarize(audioFile: string, segments: TranscriptSegment[]): Promise<TranscriptSegment[]> {
    // Try whisperx first (includes diarization)
    const whisperxResult = await this.tryWhisperX(audioFile);
    if (whisperxResult) return whisperxResult;

    // Try pyannote
    const pyannoteResult = await this.tryPyannote(audioFile, segments);
    if (pyannoteResult) return pyannoteResult;

    // No diarization available — return original segments
    logger.debug("Speaker diarization not available (install whisperx or pyannote.audio)");
    return segments;
  }

  private async tryWhisperX(audioFile: string): Promise<TranscriptSegment[] | null> {
    const outFile = join(tmpdir(), `shogun-diar-${randomBytes(4).toString("hex")}.json`);
    try {
      const hfArg = this.hfToken ? `--hf_token ${this.hfToken}` : "";
      await execAsync(
        `whisperx "${audioFile}" --model base --language ja --diarize ${hfArg} --output_format json --output_dir "${tmpdir()}"`,
        { timeout: 120000 }
      );

      const json = await readFile(outFile, "utf-8").catch(() => null);
      if (!json) return null;

      const data = JSON.parse(json) as {
        segments: { text: string; start: number; end: number; speaker?: string }[];
      };

      return data.segments.map((s) => ({
        text: s.text.trim(),
        start: s.start,
        end: s.end,
        speaker: s.speaker ?? undefined,
      }));
    } catch {
      return null;
    } finally {
      await unlink(outFile).catch(() => {});
    }
  }

  private async tryPyannote(audioFile: string, segments: TranscriptSegment[]): Promise<TranscriptSegment[] | null> {
    if (!this.hfToken) return null;

    const scriptFile = join(tmpdir(), `shogun-pyannote-${randomBytes(4).toString("hex")}.py`);
    const outFile = join(tmpdir(), `shogun-speakers-${randomBytes(4).toString("hex")}.json`);

    try {
      const script = `
import json
from pyannote.audio import Pipeline
pipeline = Pipeline.from_pretrained("pyannote/speaker-diarization-3.1", use_auth_token="${this.hfToken}")
diarization = pipeline("${audioFile}")
result = []
for turn, _, speaker in diarization.itertracks(yield_label=True):
    result.append({"start": turn.start, "end": turn.end, "speaker": speaker})
with open("${outFile}", "w") as f:
    json.dump(result, f)
`;
      await writeFile(scriptFile, script);
      await execAsync(`python3 "${scriptFile}"`, { timeout: 120000 });

      const json = await readFile(outFile, "utf-8");
      const speakers = JSON.parse(json) as { start: number; end: number; speaker: string }[];

      // Assign speakers to segments by time overlap
      return segments.map((seg) => {
        const overlap = speakers.find(
          (s) => s.start <= seg.end && s.end >= seg.start
        );
        return { ...seg, speaker: overlap?.speaker ?? undefined };
      });
    } catch {
      return null;
    } finally {
      await unlink(scriptFile).catch(() => {});
      await unlink(outFile).catch(() => {});
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await execAsync("python3 -c 'import pyannote.audio' 2>/dev/null", { timeout: 5000 });
      return true;
    } catch {
      try {
        await execAsync("whisperx --help 2>/dev/null", { timeout: 5000 });
        return true;
      } catch {
        return false;
      }
    }
  }
}
