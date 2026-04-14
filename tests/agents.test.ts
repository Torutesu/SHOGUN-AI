import { describe, it, expect } from "vitest";
import { classifyActionLevel, ApprovalQueue } from "../src/agents/levels.js";

describe("Agent Levels", () => {
  it("should classify L1 actions", () => {
    expect(classifyActionLevel("auto_tag")).toBe("L1");
    expect(classifyActionLevel("auto_summarize")).toBe("L1");
    expect(classifyActionLevel("auto_index")).toBe("L1");
  });

  it("should classify L2 actions", () => {
    expect(classifyActionLevel("draft_email")).toBe("L2");
    expect(classifyActionLevel("meeting_notes")).toBe("L2");
    expect(classifyActionLevel("weekly_digest")).toBe("L2");
  });

  it("should classify L3 actions (default)", () => {
    expect(classifyActionLevel("send_email")).toBe("L3");
    expect(classifyActionLevel("post_tweet")).toBe("L3");
    expect(classifyActionLevel("unknown")).toBe("L3");
  });
});

describe("ApprovalQueue", () => {
  it("should submit and approve L2 actions", () => {
    const queue = new ApprovalQueue();
    const action = queue.submit({
      level: "L2",
      title: "Draft email",
      description: "Test",
      payload: {},
    });

    expect(action.status).toBe("pending");
    expect(queue.getPending().length).toBe(1);

    const approved = queue.approve(action.id);
    expect(approved?.status).toBe("approved");
    expect(queue.getPending().length).toBe(0);
  });

  it("should dismiss actions", () => {
    const queue = new ApprovalQueue();
    const action = queue.submit({ level: "L2", title: "Test", description: "", payload: {} });

    queue.dismiss(action.id);
    expect(queue.getPending().length).toBe(0);
  });

  it("should auto-dismiss expired actions", () => {
    const queue = new ApprovalQueue();
    const action = queue.submit({ level: "L2", title: "Test", description: "", payload: {} });

    // Manually expire
    action.expiresAt = new Date(Date.now() - 1000);

    const dismissed = queue.cleanup();
    expect(dismissed).toBe(1);
    expect(queue.getPending().length).toBe(0);
  });

  it("should notify on new action", () => {
    const queue = new ApprovalQueue();
    let notified = false;
    queue.setNotificationHandler(() => { notified = true; });

    queue.submit({ level: "L2", title: "Test", description: "", payload: {} });
    expect(notified).toBe(true);
  });
});
