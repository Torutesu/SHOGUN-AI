/**
 * Sentry error monitoring.
 *
 * Captures unhandled exceptions and sends to Sentry.
 * Lightweight — no Sentry SDK dependency, uses the HTTP API directly.
 */

import { logger } from "../logger.js";

export class SentryClient {
  private dsn: string;
  private enabled: boolean;

  constructor(options?: { dsn?: string }) {
    this.dsn = options?.dsn ?? process.env.SENTRY_DSN ?? "";
    this.enabled = Boolean(this.dsn);
  }

  /**
   * Install global error handlers.
   */
  install(): void {
    if (!this.enabled) return;

    process.on("uncaughtException", (err) => {
      this.captureException(err);
      logger.error(`Uncaught exception: ${err.message}`);
    });

    process.on("unhandledRejection", (reason) => {
      this.captureException(reason instanceof Error ? reason : new Error(String(reason)));
      logger.error(`Unhandled rejection: ${reason}`);
    });
  }

  /**
   * Capture an exception and send to Sentry.
   */
  async captureException(error: Error): Promise<void> {
    if (!this.enabled) return;

    try {
      const parsed = parseDSN(this.dsn);
      if (!parsed) return;

      await fetch(parsed.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${parsed.publicKey}, sentry_client=shogun/0.1.0`,
        },
        body: JSON.stringify({
          event_id: crypto.randomUUID?.() ?? `${Date.now()}`,
          timestamp: new Date().toISOString(),
          platform: "node",
          level: "error",
          exception: {
            values: [{
              type: error.name,
              value: error.message,
              stacktrace: {
                frames: (error.stack ?? "").split("\n").slice(1).map((line) => ({
                  filename: line.trim(),
                })),
              },
            }],
          },
          tags: { app: "shogun", version: "0.1.0" },
        }),
      });
    } catch {
      // Silently fail — don't crash on error reporting
    }
  }
}

function parseDSN(dsn: string): { endpoint: string; publicKey: string } | null {
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const projectId = url.pathname.replace("/", "");
    const endpoint = `${url.protocol}//${url.host}/api/${projectId}/store/`;
    return { endpoint, publicKey };
  } catch {
    return null;
  }
}
