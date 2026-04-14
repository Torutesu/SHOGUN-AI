import { describe, it, expect } from "vitest";
import {
  containsCJK,
  cjkBigrams,
  tokenizeForSearch,
  expandQueryForCJK,
} from "../src/search/japanese.js";

describe("Japanese Search", () => {
  describe("containsCJK", () => {
    it("should detect Japanese hiragana", () => {
      expect(containsCJK("こんにちは")).toBe(true);
    });

    it("should detect Japanese katakana", () => {
      expect(containsCJK("カタカナ")).toBe(true);
    });

    it("should detect kanji", () => {
      expect(containsCJK("漢字")).toBe(true);
    });

    it("should detect mixed text", () => {
      expect(containsCJK("Hello 東京")).toBe(true);
    });

    it("should return false for English only", () => {
      expect(containsCJK("Hello World")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(containsCJK("")).toBe(false);
    });
  });

  describe("cjkBigrams", () => {
    it("should generate bigrams from kanji", () => {
      const bigrams = cjkBigrams("東京都");
      expect(bigrams).toContain("東京");
      expect(bigrams).toContain("京都");
      expect(bigrams.length).toBe(2);
    });

    it("should generate bigrams from hiragana", () => {
      const bigrams = cjkBigrams("こんにちは");
      expect(bigrams).toContain("こん");
      expect(bigrams).toContain("んに");
      expect(bigrams).toContain("にち");
      expect(bigrams).toContain("ちは");
    });

    it("should handle single CJK character", () => {
      const bigrams = cjkBigrams("東");
      expect(bigrams).toContain("東");
    });

    it("should handle mixed text", () => {
      const bigrams = cjkBigrams("Hello東京World");
      expect(bigrams).toContain("東京");
    });

    it("should return empty for non-CJK text", () => {
      expect(cjkBigrams("Hello")).toEqual([]);
    });

    it("should deduplicate bigrams", () => {
      const bigrams = cjkBigrams("東京東京");
      const unique = new Set(bigrams);
      expect(bigrams.length).toBe(unique.size);
    });
  });

  describe("tokenizeForSearch", () => {
    it("should tokenize mixed Japanese-English text", () => {
      const tokens = tokenizeForSearch("SHOGUN is 東京のAIスタートアップ");
      expect(tokens).toContain("shogun");
      expect(tokens).toContain("東京");
      expect(tokens).toContain("京の");
    });

    it("should handle English-only text", () => {
      const tokens = tokenizeForSearch("Hello World");
      expect(tokens).toContain("hello");
      expect(tokens).toContain("world");
    });

    it("should handle Japanese-only text", () => {
      const tokens = tokenizeForSearch("こんにちは世界");
      expect(tokens).toContain("こん");
      expect(tokens).toContain("は世");
    });
  });

  describe("expandQueryForCJK", () => {
    it("should expand CJK query with bigrams", () => {
      const expanded = expandQueryForCJK("東京");
      expect(expanded).toContain("東京");
    });

    it("should not modify English-only query", () => {
      const expanded = expandQueryForCJK("hello world");
      expect(expanded).toBe("hello world");
    });

    it("should handle mixed query", () => {
      const expanded = expandQueryForCJK("SHOGUN 東京");
      expect(expanded).toContain("SHOGUN");
      expect(expanded).toContain("東京");
    });
  });
});
