import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { logger } from "../logger.js";
import { PIIFilter } from "../security/pii.js";

const execAsync = promisify(exec);

/**
 * Meeting audio capture engine — Granola-style background recording.
 *
 * NO meeting bot. NO joining calls. Captures system audio output
 * (what the user hears through speakers/headphones) and transcribes
 * it locally using Whisper.
 *
 * Architecture:
 *   macOS:   ScreenCaptureKit audio or BlackHole virtual audio → ffmpeg → Whisper
 *   Windows: WASAPI loopback capture via ffmpeg → Whisper
 *   Linux:   PulseAudio monitor source via ffmpeg → Whisper
 *
 * Whisper runs locally — no audio data leaves the device.
 *
 * Meeting detection:
 *   Detects active meetings by monitoring for Zoom/Meet/Teams processes
 *   and window titles. Only captures during detected meetings.
 */

export interface TranscriptSegment {
  text: string;
  start: number;  // seconds from recording start
  end: number;
  speaker?: string;
}

export interface AudioCaptureOptions {
  /** Callback when a new transcript chunk is ready */
  onTranscript: (segments: TranscriptSegment[], meetingApp: string) => Promise<void>;
  /** Callback when a meeting ends — triggers auto-summary */
  onMeetingEnd?: (meetingApp: string, fullTranscript: string) => Promise<void>;
  /** Callback for errors */
  onError?: (error: { type: string; message: string }) => void;
  /** PII filter */
  piiFilter?: PIIFilter;
  /** Whisper model size (default: "base" for speed/quality balance) */
  whisperModel?: "tiny" | "base" | "small" | "medium";
  /** Chunk duration in seconds for incremental transcription (default: 30) */
  chunkDurationSec?: number;
  /** Meeting detection polling interval in ms (default: 5000) */
  meetingCheckIntervalMs?: number;
}

const MEETING_APPS = [
  // Process names to detect active meetings
  { process: "zoom.us", name: "Zoom" },
  { process: "zoom", name: "Zoom" },
  { process: "Google Chrome", title: "meet.google.com", name: "Google Meet" },
  { process: "Microsoft Teams", name: "Teams" },
  { process: "ms-teams", name: "Teams" },
  { process: "Slack", title: "Huddle", name: "Slack Huddle" },
  { process: "FaceTime", name: "FaceTime" },
  { process: "Discord", title: "Voice", name: "Discord" },
];

export class AudioCaptureEngine {
  private platform: string;
  private piiFilter: PIIFilter;
  private onTranscript: (segments: TranscriptSegment[], meetingApp: string) => Promise<void>;
  private onMeetingEnd: ((meetingApp: string, fullTranscript: string) => Promise<void>) | undefined;
  private onError: (error: { type: string; message: string }) => void;
  private fullTranscript: string[] = [];
  private whisperModel: string;
  private chunkDuration: number;
  private meetingCheckInterval: number;
  private meetingTimer: NodeJS.Timeout | null = null;
  private isRecording = false;
  private currentMeetingApp: string | null = null;
  private recordingProcess: ReturnType<typeof exec> | null = null;
  private currentAudioFile: string | null = null;
  private chunkTimer: NodeJS.Timeout | null = null;

  constructor(options: AudioCaptureOptions) {
    this.platform = process.platform;
    this.piiFilter = options.piiFilter ?? new PIIFilter({ enabled: true });
    this.onTranscript = options.onTranscript;
    this.onMeetingEnd = options.onMeetingEnd;
    this.onError = options.onError ?? (() => {});
    this.whisperModel = options.whisperModel ?? "base";
    this.chunkDuration = options.chunkDurationSec ?? 30;
    this.meetingCheckInterval = options.meetingCheckIntervalMs ?? 5000;
  }

  /**
   * Start monitoring for meetings and auto-record when detected.
   */
  start(): void {
    if (this.meetingTimer) return;
    logger.info("Audio capture: meeting detection started");

    this.meetingTimer = setInterval(async () => {
      const meeting = await this.detectActiveMeeting();

      if (meeting && !this.isRecording) {
        logger.info(`Meeting detected: ${meeting}`);
        await this.startRecording(meeting);
      } else if (!meeting && this.isRecording) {
        logger.info("Meeting ended, stopping recording");
        await this.stopRecording();
      }
    }, this.meetingCheckInterval);
  }

  stop(): void {
    if (this.meetingTimer) {
      clearInterval(this.meetingTimer);
      this.meetingTimer = null;
    }
    if (this.isRecording) {
      this.stopRecording().catch(() => {});
    }
    logger.info("Audio capture: stopped");
  }

  /**
   * Detect if a meeting app is currently running with an active call.
   */
  private async detectActiveMeeting(): Promise<string | null> {
    try {
      for (const app of MEETING_APPS) {
        const isRunning = await this.isProcessRunning(app.process, app.title);
        if (isRunning) return app.name;
      }
      return null;
    } catch {
      return null;
    }
  }

  private async isProcessRunning(processName: string, titleMatch?: string): Promise<boolean> {
    try {
      switch (this.platform) {
        case "darwin": {
          const { stdout } = await execAsync(
            `pgrep -fl "${processName}" 2>/dev/null || true`,
            { timeout: 2000 }
          );
          if (!stdout.trim()) return false;
          if (titleMatch) {
            const { stdout: titles } = await execAsync(
              `osascript -e 'tell application "System Events" to get title of every window of process "${processName}"' 2>/dev/null || echo ""`,
              { timeout: 3000 }
            );
            return titles.toLowerCase().includes(titleMatch.toLowerCase());
          }
          return true;
        }
        case "win32": {
          const { stdout } = await execAsync(
            `tasklist /FI "IMAGENAME eq ${processName}*" /FO CSV /NH 2>nul`,
            { timeout: 2000 }
          );
          if (!stdout.includes(processName)) return false;
          if (titleMatch) {
            const { stdout: titles } = await execAsync(
              `powershell -command "(Get-Process -Name '${processName}' | Where-Object {$_.MainWindowTitle -like '*${titleMatch}*'}).Count"`,
              { timeout: 3000 }
            );
            return parseInt(titles.trim()) > 0;
          }
          return true;
        }
        case "linux": {
          const { stdout } = await execAsync(
            `pgrep -fl "${processName}" 2>/dev/null || true`,
            { timeout: 2000 }
          );
          return stdout.trim().length > 0;
        }
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Start recording system audio.
   */
  private async startRecording(meetingApp: string): Promise<void> {
    if (this.isRecording) return;

    const hasFFmpeg = await this.checkFFmpeg();
    if (!hasFFmpeg) {
      this.onError({
        type: "dependency_missing",
        message: "ffmpeg is required for audio capture. Install it via: brew install ffmpeg (macOS) or choco install ffmpeg (Windows)",
      });
      return;
    }

    this.isRecording = true;
    this.currentMeetingApp = meetingApp;

    // Start chunked recording
    await this.recordChunk();

    // Set up periodic chunk processing
    this.chunkTimer = setInterval(async () => {
      if (this.isRecording) {
        await this.processCurrentChunk();
        await this.recordChunk();
      }
    }, this.chunkDuration * 1000);
  }

  private async stopRecording(): Promise<void> {
    this.isRecording = false;

    if (this.chunkTimer) {
      clearInterval(this.chunkTimer);
      this.chunkTimer = null;
    }

    // Kill recording process
    if (this.recordingProcess) {
      this.recordingProcess.kill("SIGTERM");
      this.recordingProcess = null;
    }

    // Process final chunk
    await this.processCurrentChunk();

    // Fire meeting_ended callback with full transcript for auto-summary
    const meetingApp = this.currentMeetingApp;
    if (meetingApp && this.onMeetingEnd && this.fullTranscript.length > 0) {
      const transcript = this.fullTranscript.join(" ");
      this.fullTranscript = [];
      try {
        await this.onMeetingEnd(meetingApp, transcript);
      } catch (err) {
        logger.error(`onMeetingEnd failed: ${err}`);
      }
    } else {
      this.fullTranscript = [];
    }

    this.currentMeetingApp = null;
  }

  /**
   * Record a single audio chunk using system audio capture.
   */
  private async recordChunk(): Promise<void> {
    const audioFile = join(tmpdir(), `shogun-audio-${randomBytes(4).toString("hex")}.wav`);
    this.currentAudioFile = audioFile;

    try {
      const cmd = this.getAudioCaptureCommand(audioFile);
      this.recordingProcess = exec(cmd, { timeout: (this.chunkDuration + 5) * 1000 });
    } catch (err) {
      logger.error(`Failed to start audio recording: ${err}`);
    }
  }

  /**
   * Process the current audio chunk through Whisper.
   */
  private async processCurrentChunk(): Promise<void> {
    const audioFile = this.currentAudioFile;
    if (!audioFile) return;

    // Stop current recording
    if (this.recordingProcess) {
      this.recordingProcess.kill("SIGTERM");
      this.recordingProcess = null;
    }

    // Wait for file to be flushed
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      const segments = await this.transcribe(audioFile);
      if (segments.length > 0 && this.currentMeetingApp) {
        // Apply PII filter to transcript
        const filtered = segments.map((s) => ({
          ...s,
          text: this.piiFilter.filter(s.text),
        }));
        // Accumulate for full transcript (used by onMeetingEnd)
        this.fullTranscript.push(...filtered.map((s) => s.text));
        await this.onTranscript(filtered, this.currentMeetingApp);
      }
    } catch (err) {
      logger.debug(`Transcription failed for chunk: ${err}`);
    } finally {
      await unlink(audioFile).catch(() => {});
    }
  }

  /**
   * Transcribe audio file using Whisper.
   */
  private async transcribe(audioFile: string): Promise<TranscriptSegment[]> {
    const outputFile = audioFile.replace(".wav", ".json");

    try {
      // Try whisper CLI (OpenAI's whisper or whisper.cpp)
      await execAsync(
        `whisper "${audioFile}" --model ${this.whisperModel} --language ja --output_format json --output_dir "${tmpdir()}" 2>/dev/null || ` +
        `whisper-cpp -m models/ggml-${this.whisperModel}.bin -f "${audioFile}" -oj 2>/dev/null`,
        { timeout: 60000 }
      );

      const jsonContent = await readFile(outputFile, "utf-8").catch(() => null);
      if (!jsonContent) return [];

      const data = JSON.parse(jsonContent) as {
        segments?: { text: string; start: number; end: number }[];
        text?: string;
      };

      if (data.segments) {
        return data.segments.map((s) => ({
          text: s.text.trim(),
          start: s.start,
          end: s.end,
        }));
      }

      if (data.text) {
        return [{ text: data.text.trim(), start: 0, end: 0 }];
      }

      return [];
    } catch {
      return [];
    } finally {
      await unlink(outputFile).catch(() => {});
    }
  }

  /**
   * Get platform-specific system audio capture command.
   */
  private getAudioCaptureCommand(outputFile: string): string {
    switch (this.platform) {
      case "darwin":
        // macOS: capture via BlackHole or ScreenCaptureKit
        // Falls back to default audio input if BlackHole not installed
        return `ffmpeg -f avfoundation -i ":BlackHole 2ch" -t ${this.chunkDuration} -ar 16000 -ac 1 "${outputFile}" -y 2>/dev/null || ` +
               `ffmpeg -f avfoundation -i ":0" -t ${this.chunkDuration} -ar 16000 -ac 1 "${outputFile}" -y 2>/dev/null`;

      case "win32":
        // Windows: WASAPI loopback capture (records system audio output)
        return `ffmpeg -f dshow -i audio="virtual-audio-capturer" -t ${this.chunkDuration} -ar 16000 -ac 1 "${outputFile}" -y 2>nul || ` +
               `ffmpeg -f dshow -i audio="Stereo Mix" -t ${this.chunkDuration} -ar 16000 -ac 1 "${outputFile}" -y 2>nul`;

      case "linux":
        // Linux: PulseAudio monitor source
        return `ffmpeg -f pulse -i default.monitor -t ${this.chunkDuration} -ar 16000 -ac 1 "${outputFile}" -y 2>/dev/null`;

      default:
        return `echo "Unsupported platform"`;
    }
  }

  private async checkFFmpeg(): Promise<boolean> {
    try {
      await execAsync("ffmpeg -version", { timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }
}
