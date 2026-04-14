import { describe, it, expect } from "vitest";
import { recursiveChunk } from "../src/chunking/recursive.js";

describe("recursiveChunk", () => {
  it("should return short text as a single chunk", () => {
    const chunks = recursiveChunk("Hello, world!", { maxChunkSize: 100 });
    expect(chunks).toEqual(["Hello, world!"]);
  });

  it("should return empty array for empty text", () => {
    const chunks = recursiveChunk("", { maxChunkSize: 100 });
    expect(chunks).toEqual([]);
  });

  it("should split long text into multiple chunks", () => {
    const text = "Paragraph one.\n\nParagraph two.\n\nParagraph three.\n\nParagraph four.";
    const chunks = recursiveChunk(text, { maxChunkSize: 30, chunkOverlap: 0 });
    expect(chunks.length).toBeGreaterThan(1);
    // Each chunk should be within limit
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(30);
    }
  });

  it("should split on paragraph boundaries first", () => {
    const text = "First paragraph content.\n\nSecond paragraph content.";
    const chunks = recursiveChunk(text, { maxChunkSize: 30, chunkOverlap: 0 });
    expect(chunks[0]).toBe("First paragraph content.");
    expect(chunks[1]).toBe("Second paragraph content.");
  });

  it("should handle single-line text splits", () => {
    const text = "Word1 Word2 Word3 Word4 Word5 Word6 Word7 Word8";
    const chunks = recursiveChunk(text, { maxChunkSize: 25, chunkOverlap: 0 });
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("should handle very long words gracefully", () => {
    const longWord = "a".repeat(200);
    const chunks = recursiveChunk(longWord, { maxChunkSize: 50, chunkOverlap: 0 });
    expect(chunks.length).toBeGreaterThan(1);
  });
});
