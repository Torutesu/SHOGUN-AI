import { exec, execFile } from "child_process";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { logger } from "../logger.js";
import { PIIFilter } from "../security/pii.js";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

/**
 * Real-time OCR capture engine.
 *
 * Architecture (inspired by Screenpipe):
 *
 * Layer 1 — Accessibility API (Primary, high precision):
 *   macOS:   AXUIElement tree traversal via osascript/swift
 *   Windows: UIAutomation via PowerShell
 *   Linux:   AT-SPI2 via gdbus
 *
 * Layer 2 — OCR Fallback (when Accessibility fails):
 *   macOS:   Apple Vision Framework via swift CLI
 *   Windows: Windows.Media.Ocr via PowerShell
 *   Linux:   Tesseract OCR
 *
 * The Accessibility API approach is preferred because:
 * - No screenshot needed (faster, lower CPU)
 * - Structured text with element hierarchy
 * - Higher accuracy than OCR (already parsed text)
 * - Works with password fields filtered out
 *
 * OCR is only used as fallback for apps that don't expose
 * accessibility data (e.g., some Electron apps, games).
 */

export interface OCRResult {
  text: string;
  source: "accessibility" | "ocr";
  appName: string;
  windowTitle: string;
  timestamp: Date;
  confidence?: number;
}

export interface OCRCaptureOptions {
  /** Capture interval in milliseconds (default: 2000) */
  intervalMs?: number;
  /** PII filter instance */
  piiFilter?: PIIFilter;
  /** Callback for each capture result */
  onCapture: (result: OCRResult) => Promise<void>;
  /** Callback for errors needing user attention */
  onError?: (error: { type: string; message: string }) => void;
  /** Apps to exclude from capture */
  excludeApps?: string[];
  /** Minimum text length to trigger a capture event */
  minTextLength?: number;
  /** Enable OCR fallback when accessibility fails */
  enableOCRFallback?: boolean;
}

export class OCRCaptureEngine {
  private intervalMs: number;
  private piiFilter: PIIFilter;
  private onCapture: (result: OCRResult) => Promise<void>;
  private onError: (error: { type: string; message: string }) => void;
  private excludeApps: Set<string>;
  private minTextLength: number;
  private enableOCRFallback: boolean;
  private timer: NodeJS.Timeout | null = null;
  private lastTextHash = "";
  private platform: string;

  constructor(options: OCRCaptureOptions) {
    this.intervalMs = options.intervalMs ?? 2000;
    this.piiFilter = options.piiFilter ?? new PIIFilter({ enabled: true });
    this.onCapture = options.onCapture;
    this.onError = options.onError ?? (() => {});
    this.excludeApps = new Set(
      (options.excludeApps ?? [
        "1Password", "Bitwarden", "KeePass", "LastPass",
        "Keychain Access", "Terminal", "iTerm2", "Alacritty",
      ]).map((a) => a.toLowerCase())
    );
    this.minTextLength = options.minTextLength ?? 20;
    this.enableOCRFallback = options.enableOCRFallback ?? true;
    this.platform = process.platform;
  }

  async start(): Promise<void> {
    if (this.timer) return;
    logger.info("OCR capture started", { intervalMs: this.intervalMs, platform: this.platform });

    // Initial permission check
    if (this.platform === "darwin") {
      const hasAccess = await this.checkMacOSAccessibility();
      if (!hasAccess) {
        this.onError({
          type: "permission_required",
          message: "Accessibility permission required for OCR capture. Go to System Preferences → Privacy & Security → Accessibility.",
        });
      }
    }

    this.timer = setInterval(() => {
      this.capture().catch((err) => {
        logger.debug(`OCR capture cycle failed: ${err}`);
      });
    }, this.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info("OCR capture stopped");
    }
  }

  private async capture(): Promise<void> {
    // Get active window info first
    const windowInfo = await this.getActiveWindowInfo();
    if (!windowInfo) return;

    // Skip excluded apps
    if (this.excludeApps.has(windowInfo.appName.toLowerCase())) return;

    // Try Accessibility API first (high precision)
    let text = await this.captureViaAccessibility(windowInfo.appName);

    let source: "accessibility" | "ocr" = "accessibility";

    // Fallback to OCR if accessibility returned insufficient text
    if ((!text || text.length < this.minTextLength) && this.enableOCRFallback) {
      text = await this.captureViaOCR();
      source = "ocr";
    }

    if (!text || text.length < this.minTextLength) return;

    // Dedup: skip if same as last capture
    const hash = simpleHash(text);
    if (hash === this.lastTextHash) return;
    this.lastTextHash = hash;

    // Apply PII filter
    const filtered = this.piiFilter.filter(text);

    await this.onCapture({
      text: filtered,
      source,
      appName: windowInfo.appName,
      windowTitle: windowInfo.title,
      timestamp: new Date(),
    });
  }

  // ─── Accessibility API Capture ───────────────────────────

  private async captureViaAccessibility(appName: string): Promise<string | null> {
    try {
      switch (this.platform) {
        case "darwin":
          return await this.macOSAccessibility(appName);
        case "win32":
          return await this.windowsUIAutomation();
        case "linux":
          return await this.linuxATSPI();
        default:
          return null;
      }
    } catch {
      return null;
    }
  }

  /**
   * macOS: Use AppleScript to traverse the Accessibility tree
   * and extract visible text from the frontmost application.
   *
   * This mimics Screenpipe's AXUIElement approach but via osascript
   * (no native Rust dependency needed for MVP).
   */
  private async macOSAccessibility(appName: string): Promise<string | null> {
    try {
      // Get text from focused window's UI elements
      const { stdout } = await execAsync(`osascript -e '
        tell application "System Events"
          tell process "${appName}"
            set visibleText to ""
            try
              set uiElems to every UI element of window 1
              repeat with elem in uiElems
                try
                  set elemValue to value of elem
                  if elemValue is not missing value and elemValue is not "" then
                    set visibleText to visibleText & elemValue & "\\n"
                  end if
                end try
                -- Get text from child elements (1 level deep)
                try
                  set childElems to every UI element of elem
                  repeat with child in childElems
                    try
                      set childValue to value of child
                      if childValue is not missing value and childValue is not "" then
                        set visibleText to visibleText & childValue & "\\n"
                      end if
                    end try
                  end repeat
                end try
              end repeat
            end try
            return visibleText
          end tell
        end tell'`, { timeout: 5000 });

      const text = stdout.trim();
      return text.length > 0 ? text : null;
    } catch {
      return null;
    }
  }

  /**
   * Windows: Use PowerShell + UIAutomation to get text from active window.
   */
  private async windowsUIAutomation(): Promise<string | null> {
    try {
      const { stdout } = await execAsync(`powershell -command "
        Add-Type -AssemblyName UIAutomationClient
        $root = [System.Windows.Automation.AutomationElement]::FocusedElement
        $walker = [System.Windows.Automation.TreeWalker]::ContentViewWalker
        $texts = @()
        $current = $walker.GetFirstChild($root)
        while ($current -ne $null) {
          try {
            $pattern = $current.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
            if ($pattern) { $texts += $pattern.Current.Value }
          } catch {}
          try {
            $name = $current.Current.Name
            if ($name) { $texts += $name }
          } catch {}
          $current = $walker.GetNextSibling($current)
        }
        $texts -join [Environment]::NewLine
      "`, { timeout: 5000 });

      return stdout.trim() || null;
    } catch {
      return null;
    }
  }

  /**
   * Linux: Use AT-SPI2 via gdbus to get accessible text.
   */
  private async linuxATSPI(): Promise<string | null> {
    try {
      const { stdout } = await execAsync(
        `gdbus call --session --dest org.a11y.Bus --object-path /org/a11y/bus --method org.a11y.Bus.GetAddress 2>/dev/null`,
        { timeout: 3000 }
      );
      // AT-SPI2 is complex; return null for now, use OCR fallback
      return stdout.trim() ? null : null;
    } catch {
      return null;
    }
  }

  // ─── OCR Fallback ────────────────────────────────────────

  private async captureViaOCR(): Promise<string | null> {
    try {
      switch (this.platform) {
        case "darwin":
          return await this.macOSOCR();
        case "win32":
          return await this.windowsOCR();
        case "linux":
          return await this.linuxOCR();
        default:
          return null;
      }
    } catch {
      return null;
    }
  }

  /**
   * macOS OCR: Capture screenshot → Apple Vision Framework text recognition.
   * Uses the same approach as Screenpipe's OCR fallback.
   */
  private async macOSOCR(): Promise<string | null> {
    const tmpFile = join(tmpdir(), `shogun-ocr-${randomBytes(4).toString("hex")}.png`);
    try {
      // Capture screenshot of focused window
      await execAsync(`screencapture -x -l $(osascript -e 'tell app "System Events" to get id of first window of first process whose frontmost is true') "${tmpFile}"`, { timeout: 5000 });

      // Use Vision Framework for OCR via swift
      const { stdout } = await execAsync(`swift -e '
        import Vision
        import AppKit
        let image = NSImage(contentsOfFile: "${tmpFile}")!
        let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil)!
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.recognitionLanguages = ["ja", "en"]
        request.usesLanguageCorrection = true
        let handler = VNImageRequestHandler(cgImage: cgImage)
        try handler.perform([request])
        let results = request.results ?? []
        for result in results {
          print(result.topCandidates(1).first?.string ?? "")
        }
      '`, { timeout: 10000 });

      return stdout.trim() || null;
    } catch {
      return null;
    } finally {
      await unlink(tmpFile).catch(() => {});
    }
  }

  /**
   * Windows OCR: Screenshot → Windows.Media.Ocr.
   */
  private async windowsOCR(): Promise<string | null> {
    const tmpFile = join(tmpdir(), `shogun-ocr-${randomBytes(4).toString("hex")}.png`);
    try {
      // Take screenshot
      await execAsync(`powershell -command "
        Add-Type -AssemblyName System.Windows.Forms
        $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
        $bitmap = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
        $bitmap.Save('${tmpFile}')
      "`, { timeout: 5000 });

      // OCR
      const { stdout } = await execAsync(`powershell -command "
        Add-Type -AssemblyName System.Runtime.WindowsRuntime
        $ocrEngine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
        $file = [Windows.Storage.StorageFile]::GetFileFromPathAsync('${tmpFile}').GetAwaiter().GetResult()
        $stream = $file.OpenAsync([Windows.Storage.FileAccessMode]::Read).GetAwaiter().GetResult()
        $decoder = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream).GetAwaiter().GetResult()
        $bitmap = $decoder.GetSoftwareBitmapAsync().GetAwaiter().GetResult()
        $result = $ocrEngine.RecognizeAsync($bitmap).GetAwaiter().GetResult()
        $result.Text
      "`, { timeout: 10000 });

      return stdout.trim() || null;
    } catch {
      return null;
    } finally {
      await unlink(tmpFile).catch(() => {});
    }
  }

  /**
   * Linux OCR: Screenshot → Tesseract.
   */
  private async linuxOCR(): Promise<string | null> {
    const tmpFile = join(tmpdir(), `shogun-ocr-${randomBytes(4).toString("hex")}.png`);
    try {
      await execAsync(`import -window root "${tmpFile}" 2>/dev/null || scrot "${tmpFile}" 2>/dev/null || gnome-screenshot -f "${tmpFile}" 2>/dev/null`, { timeout: 5000 });

      const { stdout } = await execAsync(`tesseract "${tmpFile}" - -l eng+jpn 2>/dev/null`, { timeout: 10000 });

      return stdout.trim() || null;
    } catch {
      return null;
    } finally {
      await unlink(tmpFile).catch(() => {});
    }
  }

  // ─── Helpers ─────────────────────────────────────────────

  private async getActiveWindowInfo(): Promise<{ appName: string; title: string } | null> {
    try {
      switch (this.platform) {
        case "darwin": {
          const { stdout } = await execAsync(
            `osascript -e 'tell application "System Events" to get {name, title} of first application process whose frontmost is true'`,
            { timeout: 3000 }
          );
          const parts = stdout.trim().split(", ");
          return { appName: parts[0] ?? "", title: parts[1] ?? "" };
        }
        case "win32": {
          const { stdout } = await execAsync(
            `powershell -command "$p = Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object -First 1; if ($p) { Write-Output ($p.ProcessName + '|||' + $p.MainWindowTitle) }"`,
            { timeout: 3000 }
          );
          const parts = stdout.trim().split("|||");
          return { appName: parts[0] ?? "unknown", title: parts[1] ?? "" };
        }
        case "linux": {
          const { stdout: name } = await execAsync("xdotool getactivewindow getwindowname 2>/dev/null", { timeout: 3000 });
          const { stdout: pid } = await execAsync("xdotool getactivewindow getwindowpid 2>/dev/null", { timeout: 3000 });
          let appName = "unknown";
          try {
            const { stdout: comm } = await execAsync(`cat /proc/${pid.trim()}/comm 2>/dev/null`);
            appName = comm.trim();
          } catch { /* keep unknown */ }
          return { appName, title: name.trim() };
        }
        default:
          return null;
      }
    } catch {
      return null;
    }
  }

  private async checkMacOSAccessibility(): Promise<boolean> {
    try {
      await execAsync(
        `osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`,
        { timeout: 5000 }
      );
      return true;
    } catch {
      return false;
    }
  }
}

function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return String(hash);
}
