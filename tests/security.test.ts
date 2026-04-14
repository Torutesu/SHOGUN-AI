import { describe, it, expect } from "vitest";
import { detectPII, removePII, containsPII, PIIFilter } from "../src/security/pii.js";
import { RateLimiter } from "../src/security/rate-limiter.js";
import { sanitizeDataDir, sanitizeError } from "../src/security/validation.js";
import { slugSchema, dateSchema, tagSchema } from "../src/security/validation.js";

describe("PII Detection", () => {
  it("should detect email addresses", () => {
    const detections = detectPII("Contact me at user@example.com for details.");
    expect(detections.some((d) => d.type === "email")).toBe(true);
    expect(detections[0].match).toBe("user@example.com");
  });

  it("should detect credit card numbers", () => {
    const detections = detectPII("Card: 4111111111111111");
    expect(detections.some((d) => d.type === "credit_card")).toBe(true);
  });

  it("should detect API keys", () => {
    const detections = detectPII("Key: sk-1234567890abcdefghijklmnop");
    expect(detections.some((d) => d.type === "api_key")).toBe(true);
  });

  it("should detect password patterns", () => {
    const detections = detectPII("password: mysecretpass123");
    expect(detections.some((d) => d.type === "secret_context")).toBe(true);
  });

  it("should detect Japanese phone numbers", () => {
    const detections = detectPII("電話: 090-1234-5678");
    expect(detections.some((d) => d.type === "phone_jp")).toBe(true);
  });

  it("should detect IP addresses", () => {
    const detections = detectPII("Server: 192.168.1.100");
    expect(detections.some((d) => d.type === "ip_address")).toBe(true);
  });

  it("should return empty for clean text", () => {
    expect(detectPII("Hello World")).toEqual([]);
    expect(containsPII("Hello World")).toBe(false);
  });
});

describe("PII Removal", () => {
  it("should replace email with placeholder", () => {
    const result = removePII("Email: user@example.com");
    expect(result).toBe("Email: [EMAIL]");
    expect(result).not.toContain("user@example.com");
  });

  it("should replace API keys with placeholder", () => {
    const result = removePII("token: sk-ant-abc123defghijklmnopqrstuv");
    expect(result).not.toContain("sk-ant-");
  });

  it("should replace multiple PII types", () => {
    const text = "Contact user@test.com at 192.168.0.1, password: secret123";
    const result = removePII(text);
    expect(result).not.toContain("user@test.com");
    expect(result).not.toContain("192.168.0.1");
    expect(result).not.toContain("secret123");
  });
});

describe("PIIFilter", () => {
  it("should pass through when disabled", () => {
    const filter = new PIIFilter({ enabled: false });
    expect(filter.filter("user@test.com")).toBe("user@test.com");
  });

  it("should filter when enabled", () => {
    const filter = new PIIFilter({ enabled: true, logDetections: false });
    expect(filter.filter("user@test.com")).toBe("[EMAIL]");
  });

  it("should filter multiple fields", () => {
    const filter = new PIIFilter({ enabled: true, logDetections: false });
    const result = filter.filterFields({
      title: "Meeting with user@test.com",
      body: "Password: secret123",
    });
    expect(result.title).not.toContain("user@test.com");
    expect(result.body).not.toContain("secret123");
  });
});

describe("RateLimiter", () => {
  it("should allow calls within limit", () => {
    const limiter = new RateLimiter({ test_tool: { maxCalls: 3, windowMs: 1000 } });
    expect(limiter.check("test_tool")).toBe(true);
    expect(limiter.check("test_tool")).toBe(true);
    expect(limiter.check("test_tool")).toBe(true);
  });

  it("should reject calls over limit", () => {
    const limiter = new RateLimiter({ test_tool: { maxCalls: 2, windowMs: 1000 } });
    expect(limiter.check("test_tool")).toBe(true);
    expect(limiter.check("test_tool")).toBe(true);
    expect(limiter.check("test_tool")).toBe(false); // Over limit
  });

  it("should track remaining calls", () => {
    const limiter = new RateLimiter({ test_tool: { maxCalls: 5, windowMs: 1000 } });
    expect(limiter.remaining("test_tool")).toBe(5);
    limiter.check("test_tool");
    expect(limiter.remaining("test_tool")).toBe(4);
  });

  it("should allow unconfigured tools", () => {
    const limiter = new RateLimiter();
    expect(limiter.check("unknown_tool")).toBe(true);
  });

  it("should reset state", () => {
    const limiter = new RateLimiter({ test_tool: { maxCalls: 1, windowMs: 60000 } });
    limiter.check("test_tool");
    expect(limiter.check("test_tool")).toBe(false);
    limiter.reset();
    expect(limiter.check("test_tool")).toBe(true);
  });
});

describe("Validation", () => {
  describe("slugSchema", () => {
    it("should accept valid slugs", () => {
      expect(slugSchema.safeParse("people/toru-yamamoto").success).toBe(true);
      expect(slugSchema.safeParse("companies/select-kk").success).toBe(true);
      expect(slugSchema.safeParse("concepts/memory-layer").success).toBe(true);
      expect(slugSchema.safeParse("sessions/2025-01-15").success).toBe(true);
    });

    it("should reject path traversal attempts", () => {
      expect(slugSchema.safeParse("../../../etc/passwd").success).toBe(false);
      expect(slugSchema.safeParse("people/../../../secret").success).toBe(false);
    });

    it("should reject empty or too-short slugs", () => {
      expect(slugSchema.safeParse("").success).toBe(false);
      expect(slugSchema.safeParse("a").success).toBe(false);
    });

    it("should reject slugs without prefix", () => {
      expect(slugSchema.safeParse("just-a-name").success).toBe(false);
    });
  });

  describe("dateSchema", () => {
    it("should accept valid dates", () => {
      expect(dateSchema.safeParse("2025-01-15").success).toBe(true);
    });

    it("should reject invalid formats", () => {
      expect(dateSchema.safeParse("2025/01/15").success).toBe(false);
      expect(dateSchema.safeParse("January 15").success).toBe(false);
    });
  });

  describe("sanitizeDataDir", () => {
    it("should strip path traversal", () => {
      expect(sanitizeDataDir("../../etc/passwd")).toBe("etc/passwd");
      expect(sanitizeDataDir("./pgdata/../../../secret")).toBe("./pgdata/secret");
    });

    it("should reject system directories", () => {
      expect(() => sanitizeDataDir("/etc/shogun")).toThrow();
      expect(() => sanitizeDataDir("/usr/lib/data")).toThrow();
    });

    it("should allow normal paths", () => {
      expect(sanitizeDataDir("./pgdata")).toBe("./pgdata");
      expect(sanitizeDataDir("/home/user/data")).toBe("/home/user/data");
    });
  });

  describe("sanitizeError", () => {
    it("should strip file paths from errors", () => {
      const result = sanitizeError(new Error("Failed at /home/user/app/src/brain.ts:42"));
      expect(result).not.toContain("/home/user");
      expect(result).toContain("[internal]");
    });

    it("should handle zod errors", () => {
      const result = slugSchema.safeParse("bad");
      if (!result.success) {
        const msg = sanitizeError(result.error);
        expect(msg).toContain("Validation error");
      }
    });

    it("should cap length", () => {
      const longError = new Error("x".repeat(1000));
      expect(sanitizeError(longError).length).toBeLessThanOrEqual(200);
    });
  });
});
