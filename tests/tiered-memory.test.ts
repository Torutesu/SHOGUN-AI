import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ShogunBrain } from "../src/brain.js";
import { TieredMemory, getPageTier, getTierBoost } from "../src/memory/tiered-memory.js";

describe("TieredMemory", () => {
  let brain: ShogunBrain;
  let tiered: TieredMemory;

  beforeEach(async () => {
    brain = new ShogunBrain({ dataDir: "memory://" });
    await brain.init();
    tiered = new TieredMemory(brain.engine);
  });

  afterEach(async () => {
    await brain.close();
  });

  it("should return tier stats", async () => {
    await brain.pages.putPage({ slug: "concepts/hot", type: "concept", title: "Hot", compiled_truth: "Recent" });
    const stats = await tiered.getTierStats();
    expect(stats.hot).toBe(1);
    expect(stats.warm).toBe(0);
    expect(stats.cold).toBe(0);
  });

  it("should get hot pages", async () => {
    await brain.pages.putPage({ slug: "concepts/hot1", type: "concept", title: "Hot1", compiled_truth: "A" });
    const hot = await tiered.getHotPages();
    expect(hot.length).toBe(1);
  });
});

describe("getPageTier", () => {
  it("should classify recent as hot", () => {
    expect(getPageTier(new Date())).toBe("hot");
  });

  it("should classify old as cold", () => {
    expect(getPageTier(new Date("2020-01-01"))).toBe("cold");
  });
});

describe("getTierBoost", () => {
  it("should boost hot pages", () => {
    expect(getTierBoost("hot")).toBe(1.5);
  });

  it("should penalize cold pages", () => {
    expect(getTierBoost("cold")).toBe(0.7);
  });
});
