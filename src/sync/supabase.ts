import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../logger.js";

/**
 * Supabase client wrapper for SHOGUN cloud sync.
 *
 * Architecture:
 *   PGLite (local) = primary store — works offline, instant reads
 *   Supabase (cloud) = sync target — multi-device, backup, team features
 *
 * The local PGLite is always the source of truth.
 * Supabase is written to asynchronously after local writes.
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  /** Clerk user ID — set after authentication */
  userId?: string;
  /** Unique device identifier */
  deviceId?: string;
}

export class SupabaseSync {
  private client: SupabaseClient;
  private userId: string | null;
  private deviceId: string;
  private _enabled: boolean;

  constructor(config: SupabaseConfig) {
    this.client = createClient(config.url, config.anonKey);
    this.userId = config.userId ?? null;
    this.deviceId = config.deviceId ?? `device-${Date.now()}`;
    this._enabled = Boolean(config.url && config.anonKey);

    if (this._enabled) {
      logger.info("Supabase sync initialized", { deviceId: this.deviceId });
    }
  }

  get enabled(): boolean {
    return this._enabled && this.userId !== null;
  }

  setUserId(userId: string): void {
    this.userId = userId;
    logger.info("Supabase user set", { userId });
  }

  /**
   * Push a page to Supabase (upsert by slug + user_id).
   */
  async pushPage(page: {
    slug: string;
    type: string;
    title: string;
    compiled_truth: string;
    timeline: string;
    content_hash: string;
    frontmatter: Record<string, unknown>;
  }): Promise<void> {
    if (!this.enabled) return;

    try {
      const { error } = await this.client.from("pages").upsert({
        user_id: this.userId,
        device_id: this.deviceId,
        slug: page.slug,
        type: page.type,
        title: page.title,
        compiled_truth: page.compiled_truth,
        timeline: page.timeline,
        content_hash: page.content_hash,
        frontmatter: page.frontmatter,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,slug",
      });

      if (error) {
        logger.warn(`Supabase push failed for ${page.slug}: ${error.message}`);
      }
    } catch (err) {
      logger.warn(`Supabase push error: ${err}`);
    }
  }

  /**
   * Pull pages from Supabase that are newer than local.
   */
  async pullChanges(since: Date): Promise<{
    slug: string;
    type: string;
    title: string;
    compiled_truth: string;
    timeline: string;
    content_hash: string;
  }[]> {
    if (!this.enabled) return [];

    try {
      const { data, error } = await this.client
        .from("pages")
        .select("slug, type, title, compiled_truth, timeline, content_hash")
        .eq("user_id", this.userId)
        .gt("updated_at", since.toISOString())
        .order("updated_at", { ascending: false })
        .limit(500);

      if (error) {
        logger.warn(`Supabase pull failed: ${error.message}`);
        return [];
      }

      return data ?? [];
    } catch (err) {
      logger.warn(`Supabase pull error: ${err}`);
      return [];
    }
  }

  /**
   * Delete a page from Supabase.
   */
  async deletePage(slug: string): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.client.from("pages")
        .delete()
        .eq("user_id", this.userId)
        .eq("slug", slug);
    } catch (err) {
      logger.warn(`Supabase delete error: ${err}`);
    }
  }

  /**
   * Push tags for a page.
   */
  async pushTags(slug: string, tags: string[]): Promise<void> {
    if (!this.enabled) return;

    try {
      // Delete existing tags for this page+user, then insert new
      await this.client.from("tags")
        .delete()
        .eq("user_id", this.userId)
        .eq("slug", slug);

      if (tags.length > 0) {
        await this.client.from("tags").insert(
          tags.map((tag) => ({
            user_id: this.userId,
            slug,
            tag,
          }))
        );
      }
    } catch (err) {
      logger.warn(`Supabase tags push error: ${err}`);
    }
  }

  /**
   * Push timeline entries.
   */
  async pushTimelineEntry(entry: {
    slug: string;
    entry_date: string;
    content: string;
    source: string | null;
  }): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.client.from("timeline_entries").insert({
        user_id: this.userId,
        device_id: this.deviceId,
        slug: entry.slug,
        entry_date: entry.entry_date,
        content: entry.content,
        source: entry.source,
      });
    } catch (err) {
      logger.warn(`Supabase timeline push error: ${err}`);
    }
  }

  /**
   * Get subscription status from Supabase (written by Vercel webhook).
   */
  async getSubscriptionStatus(): Promise<{
    plan: string;
    active: boolean;
    current_period_end: string | null;
  } | null> {
    if (!this.userId) return null;

    try {
      const { data } = await this.client
        .from("subscriptions")
        .select("plan, active, current_period_end")
        .eq("user_id", this.userId)
        .single();

      return data ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Full sync: push all local pages to Supabase.
   */
  async fullSync(pages: {
    slug: string;
    type: string;
    title: string;
    compiled_truth: string;
    timeline: string;
    content_hash: string;
    frontmatter: Record<string, unknown>;
  }[]): Promise<{ pushed: number; errors: number }> {
    if (!this.enabled) return { pushed: 0, errors: 0 };

    let pushed = 0;
    let errors = 0;

    for (const page of pages) {
      try {
        await this.pushPage(page);
        pushed++;
      } catch {
        errors++;
      }
    }

    logger.info(`Full sync complete: ${pushed} pushed, ${errors} errors`);
    return { pushed, errors };
  }
}
