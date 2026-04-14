import type { ShogunBrain } from "../brain.js";
import type { TimelineEntry } from "../types.js";
import { logger } from "../logger.js";

/**
 * Timeline service: provides structured day-by-day activity views.
 *
 * This is the Screenpipe-style timeline — shows everything captured
 * organized by time, with app breakdown and text previews.
 */

export interface TimelineDay {
  date: string;
  entries: TimelineEntry[];
  pageSlug: string;
  totalEntries: number;
  appBreakdown: Record<string, number>;
  sources: Record<string, number>;
}

export class TimelineService {
  constructor(private brain: ShogunBrain) {}

  /**
   * Get timeline for a date range, grouped by day.
   */
  async getRange(options: {
    startDate: string;
    endDate: string;
    limit?: number;
  }): Promise<TimelineDay[]> {
    const days = await this.brain.engine.query<{
      entry_date: string;
      count: number;
    }>(
      `SELECT entry_date, COUNT(*)::int as count
       FROM timeline_entries
       WHERE entry_date >= $1 AND entry_date <= $2
       GROUP BY entry_date
       ORDER BY entry_date DESC
       LIMIT $3`,
      [options.startDate, options.endDate, options.limit ?? 30]
    );

    const result: TimelineDay[] = [];

    for (const day of days) {
      const entries = await this.brain.engine.query<TimelineEntry>(
        `SELECT * FROM timeline_entries
         WHERE entry_date = $1
         ORDER BY created_at DESC
         LIMIT 200`,
        [day.entry_date]
      );

      // Calculate app breakdown from source field
      const appBreakdown: Record<string, number> = {};
      const sources: Record<string, number> = {};

      for (const entry of entries) {
        // Parse app name from content like "[Chrome] page title"
        const appMatch = entry.content.match(/^\[([^\]]+)\]/);
        const appName = appMatch ? appMatch[1] : "Other";
        appBreakdown[appName] = (appBreakdown[appName] ?? 0) + 1;

        const src = entry.source ?? "unknown";
        sources[src] = (sources[src] ?? 0) + 1;
      }

      result.push({
        date: day.entry_date,
        entries,
        pageSlug: `sessions/${day.entry_date}`,
        totalEntries: day.count,
        appBreakdown,
        sources,
      });
    }

    return result;
  }

  /**
   * Get today's timeline.
   */
  async getToday(): Promise<TimelineDay | null> {
    const today = new Date().toISOString().slice(0, 10);
    const days = await this.getRange({ startDate: today, endDate: today, limit: 1 });
    return days[0] ?? null;
  }

  /**
   * Delete timeline entries within a time range.
   * Supports: "last_5min", "last_15min", "last_30min", "last_1h", "custom"
   */
  async deleteRange(range: string, customStart?: string, customEnd?: string): Promise<number> {
    let cutoff: Date;
    const now = new Date();

    switch (range) {
      case "last_5min": cutoff = new Date(now.getTime() - 5 * 60000); break;
      case "last_15min": cutoff = new Date(now.getTime() - 15 * 60000); break;
      case "last_30min": cutoff = new Date(now.getTime() - 30 * 60000); break;
      case "last_1h": cutoff = new Date(now.getTime() - 60 * 60000); break;
      case "custom": {
        if (!customStart || !customEnd) return 0;
        const result = await this.brain.engine.query<{ count: number }>(
          `WITH deleted AS (
             DELETE FROM timeline_entries
             WHERE entry_date >= $1 AND entry_date <= $2
             RETURNING 1
           ) SELECT COUNT(*)::int as count FROM deleted`,
          [customStart, customEnd]
        );
        return result[0]?.count ?? 0;
      }
      default: return 0;
    }

    const result = await this.brain.engine.query<{ count: number }>(
      `WITH deleted AS (
         DELETE FROM timeline_entries
         WHERE created_at >= $1
         RETURNING 1
       ) SELECT COUNT(*)::int as count FROM deleted`,
      [cutoff.toISOString()]
    );

    logger.info(`Deleted ${result[0]?.count ?? 0} timeline entries (${range})`);
    return result[0]?.count ?? 0;
  }
}
