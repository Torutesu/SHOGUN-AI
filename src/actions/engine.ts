import type { ShogunBrain } from "../brain.js";
import type { LLMRouter } from "../llm/router.js";
import { logger } from "../logger.js";

/**
 * Auto-action engine — scheduled triggers that act on memory.
 *
 * This is SHOGUN's killer differentiator: not just remembering,
 * but automatically ACTING on what you remember.
 *
 * Examples:
 * - "Before my Monday standup, summarize last week's Slack messages"
 * - "After every meeting, extract action items and add to timeline"
 * - "Every Friday, compile a weekly digest of new contacts"
 * - "When I visit a company's website, show me my notes about them"
 */

export interface Action {
  id: string;
  name: string;
  description: string;
  trigger: ActionTrigger;
  steps: ActionStep[];
  enabled: boolean;
  createdAt: Date;
  lastRun?: Date;
  lastResult?: string;
}

export type ActionTrigger =
  | { type: "schedule"; cron: string; description: string }
  | { type: "event"; event: "page_created" | "page_updated" | "meeting_ended" | "dream_cycle_completed" }
  | { type: "manual" };

export interface ActionStep {
  type: "search" | "summarize" | "create_page" | "add_timeline" | "notify" | "webhook" | "filter";
  params: Record<string, unknown>;
}

interface ActionContext {
  brain: ShogunBrain;
  llmRouter: LLMRouter;
  triggerData?: Record<string, unknown>;
}

// Built-in action templates
export const BUILTIN_ACTIONS: Omit<Action, "id" | "createdAt">[] = [
  {
    name: "Weekly Digest",
    description: "毎週金曜にその週のアクティビティをまとめる / Compile weekly activity digest every Friday",
    trigger: { type: "schedule", cron: "0 18 * * 5", description: "Every Friday at 18:00" },
    steps: [
      { type: "search", params: { query: "this week", type_filter: ["session"], limit: 7 } },
      { type: "summarize", params: { prompt: "Summarize this week's activities into a concise digest." } },
      { type: "create_page", params: { slug_prefix: "sessions/weekly-digest", type: "session" } },
    ],
    enabled: false,
  },
  {
    name: "Meeting Action Items",
    description: "会議終了後にアクションアイテムを自動抽出 / Extract action items after each meeting",
    trigger: { type: "event", event: "meeting_ended" },
    steps: [
      { type: "summarize", params: { prompt: "Extract all action items, decisions, and follow-ups from this meeting transcript." } },
      { type: "add_timeline", params: { source: "auto-action" } },
    ],
    enabled: false,
  },
  {
    name: "New Contact Summary",
    description: "新しい人物ページ作成時に関連情報を自動検索 / Auto-search related info when a new person page is created",
    trigger: { type: "event", event: "page_created" },
    steps: [
      { type: "search", params: { query: "{{page.title}}", limit: 5 } },
      { type: "summarize", params: { prompt: "Based on existing memory, what do we know about {{page.title}}? Add context." } },
    ],
    enabled: false,
  },
  {
    name: "Daily Standup Prep",
    description: "毎朝スタンダップ前に昨日の作業をまとめる / Summarize yesterday's work before morning standup",
    trigger: { type: "schedule", cron: "0 9 * * 1-5", description: "Weekdays at 09:00" },
    steps: [
      { type: "search", params: { query: "yesterday", type_filter: ["session"], limit: 3 } },
      { type: "summarize", params: { prompt: "Summarize yesterday's work into standup format: What I did, What I'll do today, Blockers." } },
      { type: "notify", params: { title: "Standup Prep Ready" } },
    ],
    enabled: false,
  },
];

export class ActionEngine {
  private actions: Map<string, Action> = new Map();
  private scheduledTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private brain: ShogunBrain,
    private llmRouter: LLMRouter
  ) {}

  /**
   * Register an action.
   */
  addAction(action: Action): void {
    this.actions.set(action.id, action);
    if (action.enabled && action.trigger.type === "schedule") {
      this.scheduleAction(action);
    }
    logger.info(`Action registered: ${action.name}`);
  }

  /**
   * Enable/disable an action.
   */
  setEnabled(actionId: string, enabled: boolean): void {
    const action = this.actions.get(actionId);
    if (!action) return;

    action.enabled = enabled;
    if (enabled && action.trigger.type === "schedule") {
      this.scheduleAction(action);
    } else {
      this.unscheduleAction(actionId);
    }
  }

  /**
   * Trigger all actions matching an event.
   */
  async triggerEvent(event: string, data?: Record<string, unknown>): Promise<void> {
    for (const action of this.actions.values()) {
      if (!action.enabled) continue;
      if (action.trigger.type !== "event") continue;
      if (action.trigger.event !== event) continue;

      try {
        await this.executeAction(action, data);
      } catch (err) {
        logger.error(`Action ${action.name} failed: ${err}`);
      }
    }
  }

  /**
   * Manually execute an action.
   */
  async executeAction(action: Action, triggerData?: Record<string, unknown>): Promise<string> {
    logger.info(`Executing action: ${action.name}`);
    const ctx: ActionContext = {
      brain: this.brain,
      llmRouter: this.llmRouter,
      triggerData,
    };

    let accumulatedText = "";

    for (const step of action.steps) {
      const result = await this.executeStep(step, ctx, accumulatedText);
      accumulatedText += (result ?? "") + "\n";
    }

    action.lastRun = new Date();
    action.lastResult = accumulatedText.trim();
    return action.lastResult;
  }

  private async executeStep(
    step: ActionStep,
    ctx: ActionContext,
    previousOutput: string
  ): Promise<string> {
    switch (step.type) {
      case "search": {
        const query = String(step.params.query ?? "").replace(
          /\{\{([\w.]+)\}\}/g,
          (_, key) => String(ctx.triggerData?.[key] ?? key)
        );
        const results = await ctx.brain.searchPipeline.query({
          query,
          limit: Number(step.params.limit ?? 5),
          type_filter: step.params.type_filter as ("person" | "company" | "session" | "concept")[] | undefined,
        });
        return results.map((r) => `[${r.page.title}] ${r.page.compiled_truth.slice(0, 300)}`).join("\n\n");
      }

      case "summarize": {
        const prompt = String(step.params.prompt ?? "Summarize the following:").replace(
          /\{\{([\w.]+)\}\}/g,
          (_, key) => String(ctx.triggerData?.[key] ?? key)
        );
        return ctx.llmRouter.call(
          `${prompt}\n\nContext:\n${previousOutput}`,
          "medium",
          { maxTokens: 1024 }
        );
      }

      case "create_page": {
        const date = new Date().toISOString().slice(0, 10);
        const slug = `${step.params.slug_prefix ?? "auto"}/${date}`;
        await ctx.brain.pages.putPage({
          slug,
          type: (step.params.type as "person" | "company" | "session" | "concept") ?? "session",
          title: `Auto: ${date}`,
          compiled_truth: previousOutput,
        });
        return `Created page: ${slug}`;
      }

      case "add_timeline": {
        const date = new Date().toISOString().slice(0, 10);
        const slug = `sessions/${date}`;
        let page = await ctx.brain.pages.getPage(slug);
        if (!page) {
          page = await ctx.brain.pages.putPage({
            slug,
            type: "session",
            title: `Session ${date}`,
            compiled_truth: "Daily activity log.",
          });
        }
        await ctx.brain.timeline.addEntry(
          page.id,
          date,
          previousOutput.slice(0, 5000),
          String(step.params.source ?? "auto-action")
        );
        return `Timeline entry added to ${slug}`;
      }

      case "notify": {
        logger.info(`Action notification: ${step.params.title}`);
        return `Notification: ${step.params.title}`;
      }

      case "webhook": {
        const url = String(step.params.url ?? "");
        if (!url) return "Webhook: no URL";
        try {
          const res = await fetch(url, {
            method: String(step.params.method ?? "POST"),
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "shogun_pipe",
              output: previousOutput.slice(0, 10000),
              ...step.params.body as Record<string, unknown>,
            }),
          });
          return `Webhook ${res.status}: ${url}`;
        } catch (err) {
          return `Webhook failed: ${err}`;
        }
      }

      case "filter": {
        // Filter/transform previous output using a regex or keyword
        const pattern = step.params.pattern ? new RegExp(String(step.params.pattern), "gi") : null;
        if (pattern) {
          const matches = previousOutput.match(pattern);
          return matches ? matches.join("\n") : "";
        }
        return previousOutput;
      }

      default:
        return "";
    }
  }

  private scheduleAction(action: Action): void {
    this.unscheduleAction(action.id);

    if (action.trigger.type !== "schedule") return;

    // Simple cron-like scheduler: check every minute
    const timer = setInterval(async () => {
      if (!action.enabled) return;
      if (action.trigger.type === "schedule" && this.cronMatches(action.trigger.cron)) {
        try {
          await this.executeAction(action);
        } catch (err) {
          logger.error(`Scheduled action ${action.name} failed: ${err}`);
        }
      }
    }, 60_000);

    this.scheduledTimers.set(action.id, timer);
  }

  private unscheduleAction(actionId: string): void {
    const timer = this.scheduledTimers.get(actionId);
    if (timer) {
      clearInterval(timer);
      this.scheduledTimers.delete(actionId);
    }
  }

  private cronMatches(cron: string): boolean {
    const now = new Date();
    const parts = cron.split(" ");
    if (parts.length !== 5) return false;

    const [minute, hour, , , dayOfWeek] = parts;
    const matches = (spec: string, value: number): boolean => {
      if (spec === "*") return true;
      if (spec.includes(",")) return spec.split(",").some((s) => matches(s, value));
      if (spec.includes("-")) {
        const [min, max] = spec.split("-").map(Number);
        return value >= min && value <= max;
      }
      return parseInt(spec) === value;
    };

    return (
      matches(minute, now.getMinutes()) &&
      matches(hour, now.getHours()) &&
      matches(dayOfWeek, now.getDay())
    );
  }

  listActions(): Action[] {
    return [...this.actions.values()];
  }

  stopAll(): void {
    for (const timer of this.scheduledTimers.values()) {
      clearInterval(timer);
    }
    this.scheduledTimers.clear();
  }
}
