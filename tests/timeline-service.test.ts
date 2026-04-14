import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ShogunBrain } from "../src/brain.js";
import { TimelineService } from "../src/memory/timeline-service.js";

describe("TimelineService", () => {
  let brain: ShogunBrain;
  let svc: TimelineService;

  beforeEach(async () => {
    brain = new ShogunBrain({ dataDir: "memory://" });
    await brain.init();
    svc = new TimelineService(brain);
  });

  afterEach(async () => {
    await brain.close();
  });

  it("should return empty for no data", async () => {
    const days = await svc.getRange({ startDate: "2026-01-01", endDate: "2026-12-31" });
    expect(days).toEqual([]);
  });

  it("should return today as null when empty", async () => {
    const today = await svc.getToday();
    expect(today).toBeNull();
  });

  it("should group entries by day", async () => {
    const page = await brain.pages.putPage({
      slug: "sessions/2026-04-14",
      type: "session",
      title: "Session",
      compiled_truth: "Test",
    });

    await brain.timeline.addEntry(page.id, "2026-04-14", "[Chrome] Google", "window_capture");
    await brain.timeline.addEntry(page.id, "2026-04-14", "[VSCode] brain.ts", "window_capture");
    await brain.timeline.addEntry(page.id, "2026-04-14", "Copied text", "clipboard");

    const days = await svc.getRange({ startDate: "2026-04-14", endDate: "2026-04-14" });
    expect(days.length).toBe(1);
    expect(days[0].totalEntries).toBe(3);
    expect(days[0].appBreakdown["Chrome"]).toBe(1);
    expect(days[0].appBreakdown["VSCode"]).toBe(1);
    expect(days[0].sources["window_capture"]).toBe(2);
    expect(days[0].sources["clipboard"]).toBe(1);
  });

  it("should delete entries by range", async () => {
    const page = await brain.pages.putPage({
      slug: "sessions/2026-04-14",
      type: "session",
      title: "Session",
      compiled_truth: "Test",
    });
    await brain.timeline.addEntry(page.id, "2026-04-14", "Entry 1", "test");

    const deleted = await svc.deleteRange("custom", "2026-04-14", "2026-04-14");
    expect(deleted).toBe(1);
  });
});
