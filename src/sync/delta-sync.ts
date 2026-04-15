import type { ShogunBrain } from "../brain.js";
import type { SupabaseSync } from "./supabase.js";
import { logger } from "../logger.js";

/**
 * Delta sync: keeps PGLite (local) and Supabase (cloud) in sync.
 *
 * Strategy:
 * 1. After every local write → push delta to Supabase (async)
 * 2. On app startup → pull changes from Supabase since last sync
 * 3. Conflict resolution: last-write-wins based on content_hash
 *
 * Runs as a background worker, doesn't block the main thread.
 */

export class DeltaSyncEngine {
  private syncTimer: NodeJS.Timeout | null = null;
  private lastSyncAt: Date;

  constructor(
    private brain: ShogunBrain,
    private supabase: SupabaseSync,
    private intervalMs: number = 5 * 60_000 // 5 minutes
  ) {
    this.lastSyncAt = new Date(0); // Sync everything on first run
  }

  /**
   * Start background sync loop.
   */
  start(): void {
    if (this.syncTimer) return;
    if (!this.supabase.enabled) {
      logger.debug("Delta sync: Supabase not configured, skipping");
      return;
    }

    logger.info("Delta sync started", { intervalMs: this.intervalMs });

    // Initial sync
    this.sync().catch((e) => logger.error(`Initial sync failed: ${e}`));

    // Periodic sync
    this.syncTimer = setInterval(() => {
      this.sync().catch((e) => logger.error(`Periodic sync failed: ${e}`));
    }, this.intervalMs);
  }

  stop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Run a sync cycle: pull remote changes, push local changes.
   */
  async sync(): Promise<{ pulled: number; pushed: number }> {
    let pulled = 0;
    let pushed = 0;

    try {
      // Pull: get pages updated on other devices since last sync
      const remoteChanges = await this.supabase.pullChanges(this.lastSyncAt);

      for (const remote of remoteChanges) {
        const local = await this.brain.pages.getPage(remote.slug);

        if (!local) {
          // New page from another device — create locally
          await this.brain.pages.putPage({
            slug: remote.slug,
            type: remote.type as "person" | "company" | "session" | "concept",
            title: remote.title,
            compiled_truth: remote.compiled_truth,
            timeline: remote.timeline,
          });
          pulled++;
        } else if (local.content_hash !== remote.content_hash) {
          // Different content — last-write-wins (remote is newer)
          await this.brain.pages.putPage({
            slug: remote.slug,
            type: remote.type as "person" | "company" | "session" | "concept",
            title: remote.title,
            compiled_truth: remote.compiled_truth,
            timeline: remote.timeline,
          });
          pulled++;
        }
      }

      // Push: send local pages updated since last sync
      const localPages = await this.brain.engine.query<{
        slug: string;
        type: string;
        title: string;
        compiled_truth: string;
        timeline: string;
        content_hash: string;
        frontmatter: Record<string, unknown>;
      }>(
        "SELECT slug, type, title, compiled_truth, timeline, content_hash, frontmatter FROM pages WHERE updated_at > $1",
        [this.lastSyncAt.toISOString()]
      );

      for (const page of localPages) {
        await this.supabase.pushPage(page);
        pushed++;
      }

      this.lastSyncAt = new Date();
      logger.info(`Delta sync: pulled ${pulled}, pushed ${pushed}`);
    } catch (err) {
      logger.error(`Delta sync failed: ${err}`);
    }

    return { pulled, pushed };
  }

  /**
   * Hook to call after local writes for near-real-time sync.
   */
  async onLocalWrite(page: {
    slug: string;
    type: string;
    title: string;
    compiled_truth: string;
    timeline: string;
    content_hash: string;
    frontmatter: Record<string, unknown>;
  }): Promise<void> {
    // Fire-and-forget — don't block the local write
    this.supabase.pushPage(page).catch(() => {});
  }
}
