import type { PostgresEngine } from "../engine/postgres.js";
import { logger } from "../logger.js";

/**
 * Agent failure logging and learning system.
 *
 * Records skill execution failures in AGENT_LEARNINGS table.
 * Dream Cycle processes these to:
 * - Flag skills with 3+ failures in 14 days for rewrite
 * - Promote high pain_score entries to LESSONS.md candidates
 */

export interface FailureLog {
  timestamp: string;
  skill: string;
  action: string;
  error: string;
  pain_score: number; // 1-10, higher = more impactful
  recurrence_count: number;
}

export class AgentLearnings {
  constructor(private engine: PostgresEngine) {}

  async init(): Promise<void> {
    await this.engine.exec(`
      CREATE TABLE IF NOT EXISTS agent_learnings (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        skill TEXT NOT NULL,
        action TEXT NOT NULL,
        error TEXT NOT NULL,
        pain_score INTEGER NOT NULL DEFAULT 1 CHECK (pain_score >= 1 AND pain_score <= 10),
        recurrence_count INTEGER NOT NULL DEFAULT 1,
        rewrite_flagged BOOLEAN NOT NULL DEFAULT FALSE,
        lesson_promoted BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_agent_learnings_skill ON agent_learnings(skill);
      CREATE INDEX IF NOT EXISTS idx_agent_learnings_timestamp ON agent_learnings(timestamp);
    `);
  }

  /**
   * Log a skill execution failure.
   * Automatically calculates recurrence_count for the skill.
   */
  async logFailure(entry: Omit<FailureLog, "recurrence_count">): Promise<FailureLog> {
    // Count past failures for this skill in last 14 days
    const [existing] = await this.engine.query<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM agent_learnings
       WHERE skill = $1 AND timestamp > NOW() - INTERVAL '14 days'`,
      [entry.skill]
    );
    const recurrence = (existing?.count ?? 0) + 1;

    await this.engine.query(
      `INSERT INTO agent_learnings (timestamp, skill, action, error, pain_score, recurrence_count)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [entry.timestamp, entry.skill, entry.action, entry.error, entry.pain_score, recurrence]
    );

    logger.info("Agent failure logged", {
      skill: entry.skill,
      pain_score: entry.pain_score,
      recurrence: recurrence,
    });

    return { ...entry, recurrence_count: recurrence };
  }

  /**
   * Dream Cycle processing: flag skills for rewrite and promote lessons.
   *
   * Rules:
   * - 3+ failures in 14 days for same skill → rewrite_flagged = true
   * - pain_score >= 7 → lesson_promoted = true (candidate for LESSONS.md)
   */
  async processDreamCycle(): Promise<{
    flagged_skills: string[];
    lesson_candidates: { skill: string; error: string; pain_score: number }[];
  }> {
    // Flag skills with 3+ failures in 14 days
    const frequentFailures = await this.engine.query<{ skill: string }>(
      `SELECT skill FROM agent_learnings
       WHERE timestamp > NOW() - INTERVAL '14 days'
       GROUP BY skill
       HAVING COUNT(*) >= 3`
    );

    for (const { skill } of frequentFailures) {
      await this.engine.query(
        `UPDATE agent_learnings SET rewrite_flagged = TRUE
         WHERE skill = $1 AND timestamp > NOW() - INTERVAL '14 days'`,
        [skill]
      );
    }

    // Promote high pain_score entries
    const highPain = await this.engine.query<{ skill: string; error: string; pain_score: number }>(
      `SELECT DISTINCT ON (skill) skill, error, pain_score
       FROM agent_learnings
       WHERE pain_score >= 7 AND lesson_promoted = FALSE
       ORDER BY skill, pain_score DESC`
    );

    for (const entry of highPain) {
      await this.engine.query(
        `UPDATE agent_learnings SET lesson_promoted = TRUE
         WHERE skill = $1 AND pain_score >= 7`,
        [entry.skill]
      );
    }

    const result = {
      flagged_skills: frequentFailures.map((f) => f.skill),
      lesson_candidates: highPain,
    };

    if (result.flagged_skills.length > 0 || result.lesson_candidates.length > 0) {
      logger.info("Dream Cycle agent learnings processed", result);
    }

    return result;
  }

  /**
   * Get recent failures for a skill.
   */
  async getFailures(skill: string, limit: number = 10): Promise<FailureLog[]> {
    return this.engine.query(
      `SELECT timestamp, skill, action, error, pain_score, recurrence_count
       FROM agent_learnings
       WHERE skill = $1
       ORDER BY timestamp DESC
       LIMIT $2`,
      [skill, limit]
    );
  }

  /**
   * Get all flagged skills (pending rewrite).
   */
  async getFlaggedSkills(): Promise<string[]> {
    const rows = await this.engine.query<{ skill: string }>(
      `SELECT DISTINCT skill FROM agent_learnings WHERE rewrite_flagged = TRUE`
    );
    return rows.map((r) => r.skill);
  }
}
