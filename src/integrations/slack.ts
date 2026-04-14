import type { ShogunBrain } from "../brain.js";
import { logger } from "../logger.js";

/**
 * Slack integration: imports messages and conversations into SHOGUN memory.
 *
 * Uses Slack Web API (OAuth token) to:
 * - Fetch channel messages and DMs
 * - Extract mentioned people → auto-create person pages
 * - Create session pages for daily conversation summaries
 * - Store raw messages as timeline entries
 *
 * Requires: SLACK_BOT_TOKEN environment variable
 */

interface SlackMessage {
  user: string;
  text: string;
  ts: string;
  channel: string;
}

interface SlackUser {
  id: string;
  real_name: string;
  display_name: string;
}

export class SlackIntegration {
  private token: string;
  private baseUrl = "https://slack.com/api";

  constructor(
    private brain: ShogunBrain,
    token: string
  ) {
    this.token = token;
  }

  /**
   * Fetch recent messages from a channel and ingest into memory.
   */
  async ingestChannel(channelId: string, options?: {
    limit?: number;
    oldest?: string;
  }): Promise<{ messages: number; pages_created: number }> {
    const messages = await this.fetchMessages(channelId, options?.limit ?? 100, options?.oldest);
    let pagesCreated = 0;

    // Group messages by date
    const byDate = new Map<string, SlackMessage[]>();
    for (const msg of messages) {
      const date = new Date(parseFloat(msg.ts) * 1000).toISOString().slice(0, 10);
      const existing = byDate.get(date) ?? [];
      existing.push(msg);
      byDate.set(date, existing);
    }

    // Create/update session pages for each day
    for (const [date, dayMessages] of byDate) {
      const slug = `sessions/${date}-slack-${channelId}`;
      const timeline = dayMessages
        .map((m) => `- ${new Date(parseFloat(m.ts) * 1000).toISOString().slice(11, 16)}: [${m.user}] ${m.text}`)
        .join("\n");

      const existing = await this.brain.pages.getPage(slug);
      if (!existing) {
        await this.brain.pages.putPage({
          slug,
          type: "session",
          title: `Slack #${channelId} — ${date}`,
          compiled_truth: `Slack channel conversation from ${date}.`,
          timeline,
          frontmatter: { source: "slack", channel: channelId },
        });
        await this.brain.tags.addTag(
          (await this.brain.pages.getPage(slug))!.id,
          "slack"
        );
        pagesCreated++;
      }
    }

    logger.info(`Slack ingest: ${messages.length} messages, ${pagesCreated} pages created`);
    return { messages: messages.length, pages_created: pagesCreated };
  }

  /**
   * Fetch user profile and create/update person page.
   */
  async ingestUser(userId: string): Promise<void> {
    const user = await this.fetchUser(userId);
    if (!user) return;

    const slug = `people/${user.real_name.toLowerCase().replace(/\s+/g, "-")}`;
    const existing = await this.brain.pages.getPage(slug);

    if (!existing) {
      await this.brain.pages.putPage({
        slug,
        type: "person",
        title: user.real_name,
        compiled_truth: `Slack user: ${user.display_name || user.real_name}`,
        frontmatter: { source: "slack", slack_id: user.id },
      });
    }
  }

  private async fetchMessages(channel: string, limit: number, oldest?: string): Promise<SlackMessage[]> {
    const params = new URLSearchParams({
      channel,
      limit: String(limit),
    });
    if (oldest) params.set("oldest", oldest);

    const res = await fetch(`${this.baseUrl}/conversations.history?${params}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    const data = await res.json() as { ok: boolean; messages?: SlackMessage[] };
    return data.ok ? (data.messages ?? []) : [];
  }

  private async fetchUser(userId: string): Promise<SlackUser | null> {
    const res = await fetch(`${this.baseUrl}/users.info?user=${userId}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    const data = await res.json() as { ok: boolean; user?: { id: string; real_name: string; profile: { display_name: string } } };
    if (!data.ok || !data.user) return null;
    return {
      id: data.user.id,
      real_name: data.user.real_name,
      display_name: data.user.profile.display_name,
    };
  }
}
