import { logger } from "../logger.js";

/**
 * PII (Personally Identifiable Information) detection and removal.
 *
 * Inspired by Screenpipe's approach: regex-based detection applied
 * before data reaches the database. All detection is local — no
 * data is sent to external services for PII analysis.
 *
 * Supported PII types:
 * - Email addresses
 * - Credit card numbers (Visa, MC, AmEx, Discover, JCB)
 * - Phone numbers (international + JP formats)
 * - Japanese national ID (My Number / マイナンバー)
 * - IP addresses
 * - API keys / secrets (common patterns)
 * - Passwords in context (e.g. "password: xxx")
 */

export interface PIIDetection {
  type: string;
  match: string;
  start: number;
  end: number;
}

const PII_PATTERNS: { type: string; pattern: RegExp; replacement: string }[] = [
  // Email addresses
  {
    type: "email",
    pattern: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
    replacement: "[EMAIL]",
  },
  // Credit card numbers (major card brands)
  {
    type: "credit_card",
    pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})\b/g,
    replacement: "[CREDIT_CARD]",
  },
  // Phone numbers (international)
  {
    type: "phone",
    pattern: /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
    replacement: "[PHONE]",
  },
  // Japanese phone numbers (0X0-XXXX-XXXX)
  {
    type: "phone_jp",
    pattern: /0[0-9]{1,4}[-\s]?[0-9]{1,4}[-\s]?[0-9]{3,4}\b/g,
    replacement: "[PHONE]",
  },
  // Japanese My Number (マイナンバー) — 12 digits
  {
    type: "mynumber",
    pattern: /\b[0-9]{4}[\s-]?[0-9]{4}[\s-]?[0-9]{4}\b/g,
    replacement: "[MYNUMBER]",
  },
  // IP addresses (IPv4)
  {
    type: "ip_address",
    pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    replacement: "[IP]",
  },
  // API keys and secrets (common patterns)
  {
    type: "api_key",
    pattern: /\b(?:sk-[a-zA-Z0-9]{20,}|sk-ant-[a-zA-Z0-9\-]{20,}|ghp_[a-zA-Z0-9]{36}|gho_[a-zA-Z0-9]{36}|xoxb-[0-9\-]+|xoxp-[0-9\-]+)\b/g,
    replacement: "[API_KEY]",
  },
  // Generic secret patterns (password: xxx, token: xxx, secret: xxx)
  {
    type: "secret_context",
    pattern: /(?:password|passwd|token|secret|api_key|apikey|access_key|private_key)[\s]*[:=][\s]*\S+/gi,
    replacement: "[REDACTED]",
  },
  // SSN (US Social Security Number)
  {
    type: "ssn",
    pattern: /\b[0-9]{3}-[0-9]{2}-[0-9]{4}\b/g,
    replacement: "[SSN]",
  },
];

/**
 * Detect PII in text without modifying it.
 */
export function detectPII(text: string): PIIDetection[] {
  const detections: PIIDetection[] = [];

  for (const { type, pattern } of PII_PATTERNS) {
    // Reset regex state
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      detections.push({
        type,
        match: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  return detections;
}

/**
 * Remove PII from text by replacing detected patterns with placeholders.
 */
export function removePII(text: string): string {
  let result = text;

  for (const { pattern, replacement } of PII_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    result = result.replace(regex, replacement);
  }

  return result;
}

/**
 * Check if text contains any PII.
 */
export function containsPII(text: string): boolean {
  return detectPII(text).length > 0;
}

export interface PIIFilterOptions {
  enabled: boolean;
  logDetections?: boolean;
  customPatterns?: { type: string; pattern: RegExp; replacement: string }[];
}

/**
 * PII filter that can be applied to all text before storage.
 * Configurable: can be enabled/disabled and extended with custom patterns.
 */
export class PIIFilter {
  private enabled: boolean;
  private logDetections: boolean;
  private extraPatterns: { type: string; pattern: RegExp; replacement: string }[];

  constructor(options: PIIFilterOptions = { enabled: false }) {
    this.enabled = options.enabled;
    this.logDetections = options.logDetections ?? true;
    this.extraPatterns = options.customPatterns ?? [];
  }

  /**
   * Filter text: detect and remove PII if enabled.
   */
  filter(text: string): string {
    if (!this.enabled) return text;

    // Apply standard patterns
    let result = removePII(text);

    // Apply custom patterns
    for (const { pattern, replacement } of this.extraPatterns) {
      const regex = new RegExp(pattern.source, pattern.flags);
      result = result.replace(regex, replacement);
    }

    if (this.logDetections && result !== text) {
      const detections = detectPII(text);
      logger.info("PII detected and removed", {
        types: [...new Set(detections.map((d) => d.type))],
        count: detections.length,
      });
    }

    return result;
  }

  /**
   * Filter multiple fields at once.
   */
  filterFields(fields: Record<string, string>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(fields)) {
      result[key] = this.filter(value);
    }
    return result;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}
