/**
 * Feature gating — controls what features are available per plan.
 *
 * Free:     Limited memory, 1 agent, no Pipes, no API, no analytics
 * Standard: Full memory (capped), 2 agents, no Pipes, no API
 * Pro:      Unlimited, unlimited agents, Pipes, Memory API, Analytics
 */

export type Plan = "free" | "standard" | "pro";

export interface PlanLimits {
  maxPages: number;
  maxAgents: number;
  pipelinesEnabled: boolean;
  memoryAPIEnabled: boolean;
  analyticsEnabled: boolean;
  cliFullAccess: boolean;
  prioritySupport: boolean;
  byok: boolean;
}

const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    maxPages: 100,
    maxAgents: 1,
    pipelinesEnabled: false,
    memoryAPIEnabled: false,
    analyticsEnabled: false,
    cliFullAccess: false,
    prioritySupport: false,
    byok: false,
  },
  standard: {
    maxPages: 10000,
    maxAgents: 2,
    pipelinesEnabled: false,
    memoryAPIEnabled: false,
    analyticsEnabled: false,
    cliFullAccess: true,
    prioritySupport: false,
    byok: false,
  },
  pro: {
    maxPages: Infinity,
    maxAgents: Infinity,
    pipelinesEnabled: true,
    memoryAPIEnabled: true,
    analyticsEnabled: true,
    cliFullAccess: true,
    prioritySupport: true,
    byok: true,
  },
};

export function getPlanLimits(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan];
}

export function isFeatureEnabled(plan: Plan, feature: keyof PlanLimits): boolean {
  const limits = PLAN_LIMITS[plan];
  const value = limits[feature];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  return false;
}

export function checkPageLimit(plan: Plan, currentPages: number): { allowed: boolean; limit: number; current: number } {
  const limits = PLAN_LIMITS[plan];
  return {
    allowed: currentPages < limits.maxPages,
    limit: limits.maxPages,
    current: currentPages,
  };
}
