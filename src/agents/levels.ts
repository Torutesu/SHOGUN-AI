/**
 * Agent autonomy levels (L1/L2/L3).
 *
 * L1: Auto-execute — summary, tags, reminders. No user approval needed.
 * L2: Suggest → One-click approve — drafts, task adds, meeting notes.
 *     Shows toast notification, 30s timeout auto-dismiss.
 * L3: Explicit confirmation — send email, post, create calendar event.
 *     Requires modal confirmation before execution.
 */

export type AgentLevel = "L1" | "L2" | "L3";

export interface AgentAction {
  id: string;
  level: AgentLevel;
  title: string;
  description: string;
  payload: Record<string, unknown>;
  status: "pending" | "approved" | "dismissed" | "executed";
  createdAt: Date;
  expiresAt?: Date; // L2 actions expire after 30s
}

export function classifyActionLevel(actionType: string): AgentLevel {
  const L1_ACTIONS = [
    "auto_tag", "auto_summarize", "auto_remind", "auto_index",
    "timeline_entry", "chunk_embed",
  ];
  const L2_ACTIONS = [
    "draft_email", "add_task", "meeting_notes", "create_page",
    "add_timeline", "weekly_digest", "daily_briefing",
  ];
  // Everything else is L3
  if (L1_ACTIONS.includes(actionType)) return "L1";
  if (L2_ACTIONS.includes(actionType)) return "L2";
  return "L3";
}

/**
 * L2 approval queue — pending actions waiting for user approval.
 */
export class ApprovalQueue {
  private queue: AgentAction[] = [];
  private onNewAction?: (action: AgentAction) => void;

  setNotificationHandler(handler: (action: AgentAction) => void) {
    this.onNewAction = handler;
  }

  submit(action: Omit<AgentAction, "id" | "status" | "createdAt" | "expiresAt">): AgentAction {
    const full: AgentAction = {
      ...action,
      id: `l2-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      status: "pending",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30_000), // 30s timeout
    };
    this.queue.push(full);
    this.onNewAction?.(full);
    return full;
  }

  approve(id: string): AgentAction | null {
    const action = this.queue.find((a) => a.id === id);
    if (action && action.status === "pending") {
      action.status = "approved";
      return action;
    }
    return null;
  }

  dismiss(id: string): AgentAction | null {
    const action = this.queue.find((a) => a.id === id);
    if (action && action.status === "pending") {
      action.status = "dismissed";
      return action;
    }
    return null;
  }

  /**
   * Auto-dismiss expired actions.
   */
  cleanup(): number {
    const now = Date.now();
    let dismissed = 0;
    for (const action of this.queue) {
      if (action.status === "pending" && action.expiresAt && action.expiresAt.getTime() < now) {
        action.status = "dismissed";
        dismissed++;
      }
    }
    return dismissed;
  }

  getPending(): AgentAction[] {
    return this.queue.filter((a) => a.status === "pending");
  }

  getAll(): AgentAction[] {
    return [...this.queue];
  }
}
