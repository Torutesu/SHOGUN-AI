import type { ShogunBrain } from "../brain.js";
import { logger } from "../logger.js";

/**
 * Google Calendar integration: imports events into SHOGUN memory.
 *
 * Uses Google Calendar API (OAuth2 access token) to:
 * - Fetch upcoming and past events → create session pages
 * - Extract attendees → link to person pages
 * - Store event details as timeline entries
 *
 * Requires: GOOGLE_ACCESS_TOKEN environment variable (OAuth2)
 */

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  attendees?: { email: string; displayName?: string; responseStatus: string }[];
  location?: string;
}

export class GoogleCalendarIntegration {
  private token: string;
  private baseUrl = "https://www.googleapis.com/calendar/v3";

  constructor(
    private brain: ShogunBrain,
    token: string
  ) {
    this.token = token;
  }

  /**
   * Ingest events from the primary calendar.
   */
  async ingestEvents(options?: {
    timeMin?: string;
    timeMax?: string;
    limit?: number;
  }): Promise<{ events: number; pages_created: number }> {
    const limit = options?.limit ?? 50;
    const now = new Date().toISOString();

    const params = new URLSearchParams({
      maxResults: String(limit),
      orderBy: "startTime",
      singleEvents: "true",
      timeMin: options?.timeMin ?? new Date(Date.now() - 30 * 86400000).toISOString(),
      timeMax: options?.timeMax ?? now,
    });

    const res = await fetch(
      `${this.baseUrl}/calendars/primary/events?${params}`,
      { headers: { Authorization: `Bearer ${this.token}` } }
    );
    const data = await res.json() as { items?: CalendarEvent[] };
    const events = data.items ?? [];

    let pagesCreated = 0;

    for (const event of events) {
      const date = (event.start.dateTime ?? event.start.date ?? "").slice(0, 10);
      if (!date) continue;

      const slug = `sessions/${date}-cal-${event.id.slice(0, 12)}`;
      const existing = await this.brain.pages.getPage(slug);
      if (existing) continue;

      const attendeeList = (event.attendees ?? [])
        .map((a) => a.displayName ?? a.email)
        .join(", ");

      const truth = [
        event.summary,
        event.description ? `\n${event.description.slice(0, 2000)}` : "",
        attendeeList ? `\nAttendees: ${attendeeList}` : "",
        event.location ? `\nLocation: ${event.location}` : "",
      ].join("");

      await this.brain.pages.putPage({
        slug,
        type: "session",
        title: event.summary || `Calendar Event ${date}`,
        compiled_truth: truth,
        frontmatter: {
          source: "google_calendar",
          event_id: event.id,
          date,
        },
      });

      const page = await this.brain.pages.getPage(slug);
      if (page) {
        await this.brain.tags.addTag(page.id, "calendar");

        // Link to person pages for attendees
        for (const attendee of event.attendees ?? []) {
          const name = attendee.displayName ?? attendee.email.split("@")[0];
          const personSlug = `people/${name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "")}`;
          const person = await this.brain.pages.getPage(personSlug);
          if (person) {
            await this.brain.links.addLink(page.id, person.id, "attended_by");
          }
        }
      }

      pagesCreated++;
    }

    logger.info(`Google Calendar ingest: ${events.length} events, ${pagesCreated} pages created`);
    return { events: events.length, pages_created: pagesCreated };
  }
}
