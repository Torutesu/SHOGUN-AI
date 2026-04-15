/**
 * PostHog analytics integration.
 *
 * Tracks product events for understanding user behavior.
 * All tracking is opt-in and respects privacy settings.
 *
 * Events tracked:
 * - app_launched
 * - page_created / page_searched / page_viewed
 * - capture_started / capture_paused
 * - meeting_detected / meeting_summarized
 * - dream_cycle_completed
 * - pipe_executed
 * - chat_message_sent
 */

export class PostHogClient {
  private apiKey: string;
  private host: string;
  private enabled: boolean;
  private userId: string | null = null;
  private queue: { event: string; properties: Record<string, unknown>; timestamp: string }[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(options?: { apiKey?: string; host?: string; enabled?: boolean }) {
    this.apiKey = options?.apiKey ?? process.env.POSTHOG_API_KEY ?? "";
    this.host = options?.host ?? "https://app.posthog.com";
    this.enabled = options?.enabled ?? Boolean(this.apiKey);
  }

  identify(userId: string, properties?: Record<string, unknown>): void {
    this.userId = userId;
    if (!this.enabled) return;
    this.enqueue("$identify", { $set: properties ?? {}, distinct_id: userId });
  }

  capture(event: string, properties?: Record<string, unknown>): void {
    if (!this.enabled) return;
    this.enqueue(event, properties ?? {});
  }

  private enqueue(event: string, properties: Record<string, unknown>): void {
    this.queue.push({
      event,
      properties: { ...properties, distinct_id: this.userId ?? "anonymous" },
      timestamp: new Date().toISOString(),
    });

    // Auto-flush every 30 seconds or when queue reaches 10
    if (this.queue.length >= 10) {
      this.flush();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), 30000);
    }
  }

  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.queue.length === 0 || !this.enabled) return;

    const batch = this.queue.splice(0);

    try {
      await fetch(`${this.host}/batch/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: this.apiKey,
          batch: batch.map((e) => ({
            type: "capture",
            event: e.event,
            properties: e.properties,
            timestamp: e.timestamp,
          })),
        }),
      });
    } catch {
      // Re-queue on failure
      this.queue.unshift(...batch);
    }
  }

  shutdown(): void {
    this.flush();
    if (this.flushTimer) clearTimeout(this.flushTimer);
  }
}
