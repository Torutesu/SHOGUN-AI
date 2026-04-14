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

export interface PassiveCaptureOptions {
  /** Polling interval in milliseconds (default: 5000) */
  intervalMs?: number;
  /** PII filter instance */
  piiFilter?: PIIFilter;
  /** Callback for each captured event */
  onCapture: (event: CaptureEvent) => Promise<void>;
  /** App names to exclude from capture */
  excludeApps?: string[];
  /** Minimum clipboard content length to capture */
  minClipboardLength?: number;
}

export class PassiveCaptureEngine {
  private intervalMs: number;
  private piiFilter: PIIFilter;
  private onCapture: (event: CaptureEvent) => Promise<void>;
  private excludeApps: Set<string>;
  private minClipboardLength: number;
  private timer: NodeJS.Timeout | null = null;
  private lastClipboard = "";
  private lastWindow = "";
  private platform: string;

  constructor(options: PassiveCaptureOptions) {
    this.intervalMs = options.intervalMs ?? 5000;
    this.piiFilter = options.piiFilter ?? new PIIFilter({ enabled: false });
    this.onCapture = options.onCapture;
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
  start(): void {
    if (this.timer) return;
    logger.info("Passive capture started", { intervalMs: this.intervalMs });

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
    } catch {
      // Window info failures are expected on some platforms
    }
  }

  private async readClipboard(): Promise<string> {
    switch (this.platform) {
      case "darwin":
        return (await execAsync("pbpaste")).stdout;
      case "linux":
        return (await execAsync("xclip -selection clipboard -o 2>/dev/null || xsel --clipboard --output 2>/dev/null")).stdout;
      case "win32":
        return (await execAsync("powershell -command Get-Clipboard")).stdout;
      default:
        return "";
    }
  }

  private async getActiveWindow(): Promise<{ appName: string; title: string } | null> {
    try {
      switch (this.platform) {
        case "darwin": {
          const { stdout } = await execAsync(
            `osascript -e 'tell application "System Events" to get {name, title} of first application process whose frontmost is true'`
          );
          const parts = stdout.trim().split(", ");
          return { appName: parts[0] ?? "", title: parts[1] ?? "" };
        }
        case "linux": {
          const { stdout: winId } = await execAsync("xdotool getactivewindow 2>/dev/null");
          const { stdout: name } = await execAsync(`xdotool getactivewindow getwindowname 2>/dev/null`);
          const { stdout: pid } = await execAsync(`xdotool getactivewindow getwindowpid 2>/dev/null`);
          let appName = "";
          try {
            const { stdout: comm } = await execAsync(`cat /proc/${pid.trim()}/comm 2>/dev/null`);
            appName = comm.trim();
          } catch { appName = "unknown"; }
          return { appName, title: name.trim() };
        }
        case "win32": {
          const { stdout } = await execAsync(
            `powershell -command "(Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object -First 1).MainWindowTitle"`
          );
          return { appName: "Windows", title: stdout.trim() };
        }
        default:
          return null;
      }
    } catch {
      return null;
    }
  }
}
