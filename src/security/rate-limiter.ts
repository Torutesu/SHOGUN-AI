import { logger } from "../logger.js";

/**
 * Rate limiter for MCP tool calls.
 *
 * Sliding window rate limiting: tracks calls per tool per window.
 * Protects against:
 * - Rapid-fire delete_page calls
 * - sync_brain/dream_cycle loop attacks
 * - API cost explosion from repeated query/search calls
 */

interface RateLimitConfig {
  /** Maximum calls allowed per window */
  maxCalls: number;
  /** Window size in milliseconds */
  windowMs: number;
}

const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  // Write tools — moderate limits
  put_page: { maxCalls: 60, windowMs: 60_000 },
  delete_page: { maxCalls: 10, windowMs: 60_000 },
  add_tag: { maxCalls: 60, windowMs: 60_000 },
  remove_tag: { maxCalls: 60, windowMs: 60_000 },
  add_link: { maxCalls: 60, windowMs: 60_000 },
  remove_link: { maxCalls: 60, windowMs: 60_000 },
  add_timeline_entry: { maxCalls: 60, windowMs: 60_000 },

  // Read tools — generous limits
  get_page: { maxCalls: 120, windowMs: 60_000 },
  list_pages: { maxCalls: 60, windowMs: 60_000 },
  search: { maxCalls: 60, windowMs: 60_000 },
  query: { maxCalls: 30, windowMs: 60_000 }, // Expensive (embedding calls)

  // Admin tools — strict limits
  sync_brain: { maxCalls: 2, windowMs: 300_000 }, // 2 per 5 min
  dream_cycle: { maxCalls: 1, windowMs: 600_000 }, // 1 per 10 min
  revert_version: { maxCalls: 10, windowMs: 60_000 },
};

export class RateLimiter {
  private windows: Map<string, number[]> = new Map();
  private config: Record<string, RateLimitConfig>;

  constructor(customLimits?: Record<string, RateLimitConfig>) {
    this.config = { ...DEFAULT_LIMITS, ...customLimits };
  }

  /**
   * Check if a tool call is allowed. Returns true if allowed.
   * Automatically records the call if allowed.
   */
  check(toolName: string): boolean {
    const limit = this.config[toolName];
    if (!limit) return true; // No limit configured = allow

    const now = Date.now();
    const key = toolName;

    // Get or create window
    let timestamps = this.windows.get(key);
    if (!timestamps) {
      timestamps = [];
      this.windows.set(key, timestamps);
    }

    // Remove expired timestamps
    const cutoff = now - limit.windowMs;
    while (timestamps.length > 0 && timestamps[0] <= cutoff) {
      timestamps.shift();
    }

    // Check limit
    if (timestamps.length >= limit.maxCalls) {
      logger.warn("Rate limit exceeded", {
        tool: toolName,
        calls: timestamps.length,
        maxCalls: limit.maxCalls,
        windowMs: limit.windowMs,
      });
      return false;
    }

    // Record call
    timestamps.push(now);
    return true;
  }

  /**
   * Get remaining calls for a tool in current window.
   */
  remaining(toolName: string): number {
    const limit = this.config[toolName];
    if (!limit) return Infinity;

    const now = Date.now();
    const timestamps = this.windows.get(toolName) ?? [];
    const cutoff = now - limit.windowMs;
    const active = timestamps.filter((t) => t > cutoff).length;
    return Math.max(0, limit.maxCalls - active);
  }

  /**
   * Reset rate limiter state.
   */
  reset(): void {
    this.windows.clear();
  }
}
