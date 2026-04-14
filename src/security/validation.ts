import { z } from "zod";

/**
 * Input validation and sanitization for SHOGUN Memory Layer.
 *
 * All user inputs pass through these validators before reaching
 * the database or any external API.
 */

// Slug format: type_prefix/name, alphanumeric + hyphens + CJK
const SLUG_PATTERN = /^[a-z]+\/[a-z0-9\u3000-\u9fff\u30a0-\u30ff\u3040-\u309f][\w\u3000-\u9fff\u30a0-\u30ff\u3040-\u309f\-]{0,200}$/;

export const slugSchema = z
  .string()
  .min(3)
  .max(250)
  .regex(SLUG_PATTERN, "Invalid slug format. Must be 'type/name' with alphanumeric, hyphens, or CJK characters.")
  .refine((s) => !s.includes(".."), "Slug must not contain '..'")
  .refine((s) => !s.includes("//"), "Slug must not contain '//'");

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

export const tagSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[\w\u3000-\u9fff\u30a0-\u30ff\u3040-\u309f\-]+$/, "Invalid tag characters");

export const limitSchema = z.number().int().min(1).max(500).default(50);

export const depthSchema = z.number().int().min(1).max(10).default(2);

/**
 * Sanitize a data directory path to prevent path traversal.
 */
export function sanitizeDataDir(dir: string): string {
  // Resolve relative paths and strip traversal components
  const cleaned = dir
    .replace(/\.\.\//g, "")
    .replace(/\.\.\\/g, "")
    .replace(/^~/, "");

  if (cleaned.startsWith("/etc") || cleaned.startsWith("/usr") || cleaned.startsWith("/sys")) {
    throw new Error("Data directory must not point to system directories");
  }

  return cleaned;
}

/**
 * Sanitize error messages before returning to clients.
 * Strips internal details (file paths, stack traces, SQL).
 */
export function sanitizeError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return `Validation error: ${error.errors.map((e) => e.message).join(", ")}`;
  }

  const msg = error instanceof Error ? error.message : String(error);

  // Strip file paths
  const cleaned = msg
    .replace(/\/[\w\/\.\-]+\.(ts|js|rs):\d+/g, "[internal]")
    .replace(/at\s+\S+\s+\([^)]+\)/g, "")
    .replace(/Error:\s*/g, "");

  // Cap length
  return cleaned.slice(0, 200);
}
