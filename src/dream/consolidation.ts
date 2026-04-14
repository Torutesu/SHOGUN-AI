import type { PostgresEngine } from "../engine/postgres.js";
import type { PageStore } from "../memory/pages.js";
import type { LinkStore } from "../memory/links.js";
import type { TagStore } from "../memory/tags.js";
import type { TimelineStore } from "../memory/timeline.js";
import type { LLMRouter } from "../llm/router.js";
import type { Page } from "../types.js";
import { logger } from "../logger.js";

interface MergeCandidate {
  pageA: Page;
  pageB: Page;
  similarity: number;
}

const MERGE_PROMPT = `You are a memory consolidation system. Two pages in a knowledge base may be duplicates or closely related.

Page A — "{titleA}" (type: {typeA})
Content: {contentA}

Page B — "{titleB}" (type: {typeB})
Content: {contentB}

Determine:
1. Should these pages be merged? (true/false)
2. If yes, provide the merged compiled_truth that combines both pages' information.

Return ONLY valid JSON:
{"should_merge": true/false, "merged_truth": "..." or null, "reason": "brief reason"}`;

/**
 * Memory consolidation: finds and merges duplicate or near-duplicate pages.
 *
 * Strategy:
 * 1. Find candidate pairs by title similarity (trigram or edit distance)
 * 2. Confirm merge with LLM (heavy complexity)
 * 3. Merge: combine timelines, unify compiled truth, redirect links
 */
export class MemoryConsolidator {
  constructor(
    private engine: PostgresEngine,
    private pages: PageStore,
    private links: LinkStore,
    private tags: TagStore,
    private timeline: TimelineStore,
    private llmRouter: LLMRouter
  ) {}

  /**
   * Find pages that might be duplicates based on title similarity.
   */
  async findCandidates(limit: number = 20): Promise<MergeCandidate[]> {
    // Group pages by type, then compare within groups using a bigram index.
    // This avoids the O(n²) full cross-join by bucketing first.
    const types = ["person", "company", "session", "concept"];
    const candidates: MergeCandidate[] = [];

    for (const type of types) {
      const pages = await this.engine.query<Page>(
        "SELECT * FROM pages WHERE type = $1 ORDER BY title",
        [type]
      );

      // Build bigram index for fast lookup
      const bigramIndex = new Map<string, number[]>();
      for (let i = 0; i < pages.length; i++) {
        const bigrams = getBigrams(pages[i].title.toLowerCase());
        for (const bg of bigrams) {
          const list = bigramIndex.get(bg) ?? [];
          list.push(i);
          bigramIndex.set(bg, list);
        }
      }

      // Find candidate pairs: only compare pages that share at least one bigram
      const checked = new Set<string>();
      for (let i = 0; i < pages.length; i++) {
        const bigrams = getBigrams(pages[i].title.toLowerCase());
        const neighborSet = new Set<number>();
        for (const bg of bigrams) {
          for (const j of bigramIndex.get(bg) ?? []) {
            if (j > i) neighborSet.add(j);
          }
        }

        for (const j of neighborSet) {
          const key = `${i}:${j}`;
          if (checked.has(key)) continue;
          checked.add(key);

          const sim = titleSimilarity(pages[i].title, pages[j].title);
          if (sim > 0.7) {
            candidates.push({
              pageA: pages[i],
              pageB: pages[j],
              similarity: sim,
            });
          }
        }
      }
    }

    candidates.sort((a, b) => b.similarity - a.similarity);
    return candidates.slice(0, limit);
  }

  /**
   * Check with LLM whether two pages should be merged.
   */
  async shouldMerge(
    pageA: Page,
    pageB: Page
  ): Promise<{ should_merge: boolean; merged_truth: string | null; reason: string }> {
    const prompt = MERGE_PROMPT
      .replace("{titleA}", pageA.title)
      .replace("{typeA}", pageA.type)
      .replace("{contentA}", pageA.compiled_truth.slice(0, 2000))
      .replace("{titleB}", pageB.title)
      .replace("{typeB}", pageB.type)
      .replace("{contentB}", pageB.compiled_truth.slice(0, 2000));

    try {
      const response = await this.llmRouter.call(prompt, "heavy", {
        maxTokens: 2048,
        temperature: 0.1,
      });

      const json = response.match(/\{[\s\S]*\}/)?.[0];
      if (!json) return { should_merge: false, merged_truth: null, reason: "Failed to parse LLM response" };

      const result = JSON.parse(json);
      return {
        should_merge: Boolean(result.should_merge),
        merged_truth: result.merged_truth ?? null,
        reason: result.reason ?? "",
      };
    } catch (error: unknown) {
      const err = error as Error;
      logger.warn(`Merge check failed: ${err.message}`);
      return { should_merge: false, merged_truth: null, reason: err.message };
    }
  }

  /**
   * Merge pageB into pageA:
   * - Update pageA's compiled truth
   * - Combine timelines
   * - Redirect all links from pageB to pageA
   * - Move tags
   * - Delete pageB
   */
  async merge(
    pageA: Page,
    pageB: Page,
    mergedTruth: string
  ): Promise<void> {
    logger.info(`Merging "${pageB.title}" into "${pageA.title}"`);

    // 1. Update pageA with merged truth
    await this.pages.putPage({
      slug: pageA.slug,
      type: pageA.type,
      title: pageA.title,
      compiled_truth: mergedTruth,
      timeline: combineTimelines(pageA.timeline, pageB.timeline),
    });

    // 2. Redirect links: any link pointing to pageB now points to pageA
    const incomingLinks = await this.links.getBacklinks(pageB.id);
    for (const link of incomingLinks) {
      if (link.from_page_id !== pageA.id) {
        await this.links.addLink(link.from_page_id, pageA.id, link.link_type);
      }
    }

    // Redirect outgoing links from pageB
    const outgoingLinks = await this.links.getOutgoingLinks(pageB.id);
    for (const link of outgoingLinks) {
      if (link.to_page_id !== pageA.id) {
        await this.links.addLink(pageA.id, link.to_page_id, link.link_type);
      }
    }

    // 3. Move tags from pageB to pageA
    const pageBTags = await this.tags.getTagsForPage(pageB.id);
    for (const tag of pageBTags) {
      await this.tags.addTag(pageA.id, tag);
    }

    // 4. Move timeline entries
    const pageBEntries = await this.timeline.getEntries(pageB.id);
    for (const entry of pageBEntries) {
      await this.timeline.addEntry(
        pageA.id,
        entry.entry_date,
        `[merged from ${pageB.slug}] ${entry.content}`,
        entry.source ?? undefined
      );
    }

    // 5. Delete pageB
    await this.pages.deletePage(pageB.slug);

    logger.info(`Merge complete: ${pageB.slug} → ${pageA.slug}`);
  }

  /**
   * Run full consolidation: find candidates, confirm merges, execute.
   */
  async run(options?: { dryRun?: boolean; limit?: number }): Promise<{
    candidates: number;
    merged: number;
    skipped: number;
  }> {
    const candidates = await this.findCandidates(options?.limit ?? 20);
    logger.info(`Consolidation: found ${candidates.length} merge candidates`);

    let merged = 0;
    let skipped = 0;

    for (const candidate of candidates) {
      const result = await this.shouldMerge(candidate.pageA, candidate.pageB);

      if (!result.should_merge || !result.merged_truth) {
        logger.debug(
          `Skipping merge of "${candidate.pageA.title}" + "${candidate.pageB.title}": ${result.reason}`
        );
        skipped++;
        continue;
      }

      if (options?.dryRun) {
        logger.info(
          `[DRY RUN] Would merge "${candidate.pageB.title}" into "${candidate.pageA.title}": ${result.reason}`
        );
        merged++;
        continue;
      }

      await this.merge(candidate.pageA, candidate.pageB, result.merged_truth);
      merged++;
    }

    return { candidates: candidates.length, merged, skipped };
  }
}

/**
 * Title similarity using Jaccard on character bigrams.
 */
function titleSimilarity(a: string, b: string): number {
  const bigramsA = getBigrams(a.toLowerCase());
  const bigramsB = getBigrams(b.toLowerCase());

  let intersection = 0;
  const setB = new Set(bigramsB);
  for (const bg of bigramsA) {
    if (setB.has(bg)) intersection++;
  }

  const union = new Set([...bigramsA, ...bigramsB]).size;
  return union === 0 ? 0 : intersection / union;
}

function getBigrams(s: string): string[] {
  const bigrams: string[] = [];
  for (let i = 0; i < s.length - 1; i++) {
    bigrams.push(s.slice(i, i + 2));
  }
  return bigrams;
}

/**
 * Combine two timelines, deduplicating and sorting by date.
 */
function combineTimelines(a: string, b: string): string {
  const linesA = a.split("\n").filter((l) => l.trim().startsWith("- "));
  const linesB = b.split("\n").filter((l) => l.trim().startsWith("- "));

  const allLines = new Set([...linesA, ...linesB]);
  const sorted = [...allLines].sort((a, b) => {
    const dateA = a.match(/- (\d{4}-\d{2}-\d{2})/)?.[1] ?? "";
    const dateB = b.match(/- (\d{4}-\d{2}-\d{2})/)?.[1] ?? "";
    return dateA.localeCompare(dateB);
  });

  return sorted.join("\n");
}
