import { exec } from "child_process";
import { promisify } from "util";
import { logger } from "../logger.js";
import { PIIFilter } from "../security/pii.js";

const execAsync = promisify(exec);

/**
 * Passive capture engine — lightweight, cross-platform.
 *
 * Captures:
 * 1. Clipboard content (polling)
 * 2. Active window title + app name (polling)
 *
 * All captured text passes through PII filter before storage.
 * No screenshots, no audio — text-only for privacy and efficiency.
 */

export interface CaptureEvent {
  type: "clipboard" | "window";
  text: string;
  appName?: string;
  timestamp: Date;
}

export interface CaptureError {
  type: "permission_required" | "capture_failed";
  platform: string;
  message: string;
}

export interface PassiveCaptureOptions {
  /** Polling interval in milliseconds (default: 5000) */
  intervalMs?: number;
  /** PII filter instance (default: enabled) */
  piiFilter?: PIIFilter;
  /** Callback for each captured event */
  onCapture: (event: CaptureEvent) => Promise<void>;
  /** Callback for errors that need user attention */
  onError?: (error: CaptureError) => void;
  /** App names to exclude from capture */
  excludeApps?: string[];
  /** Minimum clipboard content length to capture */
  minClipboardLength?: number;
}

export class PassiveCaptureEngine {
  private intervalMs: number;
  private piiFilter: PIIFilter;
  private onCapture: (event: CaptureEvent) => Promise<void>;
  private onError: (error: CaptureError) => void;
  private excludeApps: Set<string>;
  private minClipboardLength: number;
  private timer: NodeJS.Timeout | null = null;
  private lastClipboard = "";
  private lastWindow = "";
  private platform: string;
  private permissionChecked = false;

  constructor(options: PassiveCaptureOptions) {
    this.intervalMs = options.intervalMs ?? 5000;
    // PII filter defaults to ENABLED for privacy-first capture
    this.piiFilter = options.piiFilter ?? new PIIFilter({ enabled: true });
    this.onCapture = options.onCapture;
    this.onError = options.onError ?? ((err) => logger.warn(`Capture error: ${err.message}`));
    this.excludeApps = new Set(
      (options.excludeApps ?? [
        "1Password", "Bitwarden", "KeePass", "LastPass",
        "Keychain Access", "Terminal", "iTerm2",
      ]).map((a) => a.toLowerCase())
    );
    this.minClipboardLength = options.minClipboardLength ?? 10;
    this.platform = process.platform;
  }

  /**
   * Start passive capture polling.
   */
  async start(): Promise<void> {
    if (this.timer) return;

    // Check platform permissions before starting
    await this.checkPermissions();

    logger.info("Passive capture started", { intervalMs: this.intervalMs, platform: this.platform });

    this.timer = setInterval(() => {
      this.poll().catch((err) => {
        logger.error(`Capture poll failed: ${err}`);
      });
    }, this.intervalMs);
  }

  /**
   * Stop passive capture.
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info("Passive capture stopped");
    }
  }

  /**
   * Check platform-specific permissions and notify user if needed.
   */
  private async checkPermissions(): Promise<void> {
    if (this.permissionChecked) return;
    this.permissionChecked = true;

    if (this.platform === "darwin") {
      try {
        // Test if Accessibility API is accessible
        await execAsync(
          `osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`,
          { timeout: 5000 }
        );
      } catch {
        this.onError({
          type: "permission_required",
          platform: "macOS",
          message:
            "Accessibility permission required. Go to System Preferences → Privacy & Security → Accessibility and enable SHOGUN.",
        });
        logger.warn("macOS Accessibility permission not granted — window capture disabled");
      }
    }
  }

  private async poll(): Promise<void> {
    await Promise.all([
      this.captureClipboard(),
      this.captureActiveWindow(),
    ]);
  }

  private async captureClipboard(): Promise<void> {
    try {
      const text = await this.readClipboard();
      if (!text || text === this.lastClipboard) return;
      if (text.length < this.minClipboardLength) return;

      this.lastClipboard = text;
      const filtered = this.piiFilter.filter(text);

      await this.onCapture({
        type: "clipboard",
        text: filtered,
        timestamp: new Date(),
      });
    } catch {
      // Clipboard read failures are expected (e.g. binary content)
    }
  }

  private async captureActiveWindow(): Promise<void> {
    try {
      const info = await this.getActiveWindow();
      if (!info) return;

      const windowKey = `${info.appName}:${info.title}`;
      if (windowKey === this.lastWindow) return;
      this.lastWindow = windowKey;

      // Skip excluded apps (password managers, terminals)
      if (this.excludeApps.has(info.appName.toLowerCase())) return;

      const filtered = this.piiFilter.filter(info.title);

      await this.onCapture({
        type: "window",
        text: filtered,
        appName: info.appName,
        timestamp: new Date(),
      });
    } catch (err) {
      // Log specific errors instead of swallowing silently
      logger.debug(`Window capture failed: ${err}`);
    }
  }

  private async readClipboard(): Promise<string> {
    switch (this.platform) {
      case "darwin":
        return (await execAsync("pbpaste", { timeout: 3000 })).stdout;
      case "linux":
        return (await execAsync("xclip -selection clipboard -o 2>/dev/null || xsel --clipboard --output 2>/dev/null", { timeout: 3000 })).stdout;
      case "win32":
        return (await execAsync("powershell -command Get-Clipboard", { timeout: 3000 })).stdout;
      default:
        return "";
    }
  }

  private async getActiveWindow(): Promise<{ appName: string; title: string } | null> {
    switch (this.platform) {
      case "darwin": {
        const { stdout } = await execAsync(
          `osascript -e 'tell application "System Events" to get {name, title} of first application process whose frontmost is true'`,
          { timeout: 3000 }
        );
        const parts = stdout.trim().split(", ");
        return { appName: parts[0] ?? "", title: parts[1] ?? "" };
      }
      case "linux": {
        const { stdout: name } = await execAsync("xdotool getactivewindow getwindowname 2>/dev/null", { timeout: 3000 });
        const { stdout: pid } = await execAsync("xdotool getactivewindow getwindowpid 2>/dev/null", { timeout: 3000 });
        let appName = "unknown";
        try {
          const { stdout: comm } = await execAsync(`cat /proc/${pid.trim()}/comm 2>/dev/null`);
          appName = comm.trim();
        } catch { /* keep "unknown" */ }
        return { appName, title: name.trim() };
      }
      case "win32": {
        // Get both the process name and window title on Windows
        const { stdout } = await execAsync(
          `powershell -command "$p = Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object -First 1; if ($p) { Write-Output ($p.ProcessName + '|||' + $p.MainWindowTitle) }"`,
          { timeout: 3000 }
        );
        const parts = stdout.trim().split("|||");
        return {
          appName: parts[0] ?? "unknown",
          title: parts[1] ?? stdout.trim(),
        };
      }
      default:
        return null;
    }
  }
}
