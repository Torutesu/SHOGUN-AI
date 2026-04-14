import type { ShogunBrain } from "../brain.js";
import type { LLMRouter } from "../llm/router.js";
import { SYSTEM_PROMPTS } from "../identity.js";
import { logger } from "../logger.js";

/**
 * Daily Briefing Generator — proactive morning/night summaries.
 *
 * Morning (9:00): Yesterday's unfinished tasks + today's calendar + key context
 * Evening (21:00): Today's summary + accomplishments + tomorrow's prep
 */

export interface Briefing {
  type: "morning" | "evening";
  content: string;
  generatedAt: Date;
  sources: string[];
}

export class BriefingGenerator {
  constructor(
    private brain: ShogunBrain,
    private llmRouter: LLMRouter
  ) {}

  async generateMorning(): Promise<Briefing> {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);

    // Search for yesterday's activity
    const results = await this.brain.searchPipeline.query({
      query: `activity ${yesterday}`,
      limit: 10,
    });

    const context = results.map((r) =>
      `[${r.page.title}] ${r.page.compiled_truth.slice(0, 300)}`
    ).join("\n\n");

    const content = await this.llmRouter.call(
      `${SYSTEM_PROMPTS.weeklyDigest}\n\nContext from ${yesterday} and ${today}:\n${context}\n\nGenerate a MORNING briefing. Focus on: what was left unfinished yesterday, what's on the agenda today, any important context to remember.`,
      "medium",
      { maxTokens: 1024 }
    );

    // Save as session page
    const slug = `sessions/${today}-morning-briefing`;
    await this.brain.pages.putPage({
      slug,
      type: "session",
      title: `Morning Briefing — ${today}`,
      compiled_truth: content,
      frontmatter: { source: "briefing", type: "morning", auto_generated: true },
    });
    const page = await this.brain.pages.getPage(slug);
    if (page) await this.brain.tags.addTag(page.id, "briefing");

    logger.info("Morning briefing generated");
    return {
      type: "morning",
      content,
      generatedAt: new Date(),
      sources: results.map((r) => r.page.slug),
    };
  }

  async generateEvening(): Promise<Briefing> {
    const today = new Date().toISOString().slice(0, 10);

    const results = await this.brain.searchPipeline.query({
      query: `today ${today}`,
      limit: 10,
    });

    const context = results.map((r) =>
      `[${r.page.title}] ${r.page.compiled_truth.slice(0, 300)}`
    ).join("\n\n");

    const content = await this.llmRouter.call(
      `${SYSTEM_PROMPTS.weeklyDigest}\n\nToday's context (${today}):\n${context}\n\nGenerate an EVENING briefing. Focus on: what was accomplished today, key decisions made, what to prepare for tomorrow.`,
      "medium",
      { maxTokens: 1024 }
    );

    const slug = `sessions/${today}-evening-briefing`;
    await this.brain.pages.putPage({
      slug,
      type: "session",
      title: `Evening Briefing — ${today}`,
      compiled_truth: content,
      frontmatter: { source: "briefing", type: "evening", auto_generated: true },
    });
    const page = await this.brain.pages.getPage(slug);
    if (page) await this.brain.tags.addTag(page.id, "briefing");

    logger.info("Evening briefing generated");
    return {
      type: "evening",
      content,
      generatedAt: new Date(),
      sources: results.map((r) => r.page.slug),
    };
  }

  /**
   * Schedule automatic briefings.
   */
  schedule(): NodeJS.Timeout {
    return setInterval(async () => {
      const hour = new Date().getHours();
      const minute = new Date().getMinutes();

      if (hour === 9 && minute === 0) {
        try { await this.generateMorning(); } catch (e) { logger.error(`Morning briefing failed: ${e}`); }
      }
      if (hour === 21 && minute === 0) {
        try { await this.generateEvening(); } catch (e) { logger.error(`Evening briefing failed: ${e}`); }
      }
    }, 60_000);
  }
}
