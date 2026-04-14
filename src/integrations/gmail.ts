import type { ShogunBrain } from "../brain.js";
import type { OAuthTokenManager } from "./oauth.js";
import { paginatedFetch } from "./paginated-fetch.js";
import { logger } from "../logger.js";

/**
 * Gmail integration: imports emails into SHOGUN memory.
 *
 * Uses Gmail API (OAuth2) to:
 * - Fetch recent emails → create session pages per day
 * - Extract senders → link to person pages
 * - Store email subjects + snippets as timeline entries
 *
 * Does NOT store full email bodies by default (privacy).
 * Only subject, snippet (first 200 chars), sender, date.
 */

interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  payload: {
    headers: { name: string; value: string }[];
  };
  internalDate: string;
}

export class GmailIntegration {
  constructor(
    private brain: ShogunBrain,
    private auth: OAuthTokenManager
  ) {}

  async ingestRecent(options?: {
    maxResults?: number;
    query?: string;
  }): Promise<{ emails: number; pages_created: number }> {
    const maxResults = options?.maxResults ?? 50;
    const query = options?.query ?? "newer_than:7d";
    const token = await this.auth.getAccessToken();

    const messages = await paginatedFetch<{ id: string }>({
      url: `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}`,
      authHeader: `Bearer ${token}`,
      maxItems: maxResults,
      perPage: 20,
      extractItems: (data: unknown) => ((data as { messages?: { id: string }[] }).messages ?? []),
      extractCursor: (data: unknown) => (data as { nextPageToken?: string }).nextPageToken ?? null,
    });

    let pagesCreated = 0;
    const byDate = new Map<string, { subject: string; from: string; snippet: string; date: string }[]>();

    for (const msg of messages.slice(0, maxResults)) {
      try {
        const detail = await this.fetchMessage(token, msg.id);
        if (!detail) continue;

        const headers = detail.payload.headers;
        const subject = headers.find((h) => h.name.toLowerCase() === "subject")?.value ?? "(no subject)";
        const from = headers.find((h) => h.name.toLowerCase() === "from")?.value ?? "";
        const date = new Date(parseInt(detail.internalDate)).toISOString().slice(0, 10);

        const list = byDate.get(date) ?? [];
        list.push({ subject, from, snippet: detail.snippet, date });
        byDate.set(date, list);
      } catch {
        // Skip individual message failures
      }
    }

    for (const [date, emails] of byDate) {
      const slug = `sessions/${date}-gmail`;
      const existing = await this.brain.pages.getPage(slug);
      if (existing) continue;

      const truth = emails.map((e) =>
        `From: ${e.from}\nSubject: ${e.subject}\n${e.snippet}`
      ).join("\n\n---\n\n");

      await this.brain.pages.putPage({
        slug,
        type: "session",
        title: `Gmail — ${date}`,
        compiled_truth: truth.slice(0, 10000),
        frontmatter: { source: "gmail", email_count: emails.length },
      });

      const page = await this.brain.pages.getPage(slug);
      if (page) {
        await this.brain.tags.addTag(page.id, "gmail");
        for (const email of emails) {
          await this.brain.timeline.addEntry(page.id, date, `[${email.from}] ${email.subject}`, "gmail");
        }
      }
      pagesCreated++;
    }

    logger.info(`Gmail ingest: ${messages.length} emails, ${pagesCreated} pages`);
    return { emails: messages.length, pages_created: pagesCreated };
  }

  private async fetchMessage(token: string, id: string): Promise<GmailMessage | null> {
    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return null;
    return res.json() as Promise<GmailMessage>;
  }
}
