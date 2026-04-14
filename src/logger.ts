/**
 * Structured logger for SHOGUN Memory Layer.
 * Lightweight implementation — swap with pino in production.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

interface LogEntry {
  level: LogLevel;
  msg: string;
  ts: string;
  [key: string]: unknown;
}

class Logger {
  private level: LogLevel;

  constructor(level?: LogLevel) {
    this.level = level ?? ((process.env.SHOGUN_LOG_LEVEL as LogLevel) || "info");
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private write(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    const output = JSON.stringify(entry);

    switch (entry.level) {
      case "error":
        process.stderr.write(output + "\n");
        break;
      case "warn":
        process.stderr.write(output + "\n");
        break;
      default:
        process.stderr.write(output + "\n");
        break;
    }
  }

  debug(msg: string, data?: Record<string, unknown>): void {
    this.write({ level: "debug", msg, ts: new Date().toISOString(), ...data });
  }

  info(msg: string, data?: Record<string, unknown>): void {
    this.write({ level: "info", msg, ts: new Date().toISOString(), ...data });
  }

  warn(msg: string, data?: Record<string, unknown>): void {
    this.write({ level: "warn", msg, ts: new Date().toISOString(), ...data });
  }

  error(msg: string, data?: Record<string, unknown>): void {
    this.write({ level: "error", msg, ts: new Date().toISOString(), ...data });
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  child(context: Record<string, unknown>): ChildLogger {
    return new ChildLogger(this, context);
  }
}

class ChildLogger {
  constructor(
    private parent: Logger,
    private context: Record<string, unknown>
  ) {}

  debug(msg: string, data?: Record<string, unknown>): void {
    this.parent.debug(msg, { ...this.context, ...data });
  }

  info(msg: string, data?: Record<string, unknown>): void {
    this.parent.info(msg, { ...this.context, ...data });
  }

  warn(msg: string, data?: Record<string, unknown>): void {
    this.parent.warn(msg, { ...this.context, ...data });
  }

  error(msg: string, data?: Record<string, unknown>): void {
    this.parent.error(msg, { ...this.context, ...data });
  }
}

export const logger = new Logger();
