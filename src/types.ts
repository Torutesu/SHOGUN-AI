export type PageType = "person" | "company" | "session" | "concept";

export interface PageFrontmatter {
  type: PageType;
  title: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface Page {
  id: number;
  slug: string;
  type: PageType;
  title: string;
  compiled_truth: string;
  timeline: string;
  frontmatter: PageFrontmatter;
  content_hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface PageInput {
  slug: string;
  type: PageType;
  title: string;
  compiled_truth: string;
  timeline?: string;
  frontmatter?: Record<string, unknown>;
}

export interface ContentChunk {
  id: number;
  page_id: number;
  chunk_text: string;
  embedding: number[] | null;
  chunk_source: "compiled_truth" | "timeline";
  chunk_index: number;
  created_at: Date;
}

export interface Link {
  id: number;
  from_page_id: number;
  to_page_id: number;
  link_type: string;
  created_at: Date;
}

export interface Tag {
  id: number;
  page_id: number;
  tag: string;
  created_at: Date;
}

export interface TimelineEntry {
  id: number;
  page_id: number;
  entry_date: string;
  content: string;
  source: string | null;
  created_at: Date;
}

export interface PageVersion {
  id: number;
  page_id: number;
  version_number: number;
  compiled_truth: string;
  content_hash: string;
  created_at: Date;
}

export interface RawData {
  id: number;
  page_id: number;
  source: string;
  data: Record<string, unknown>;
  created_at: Date;
}

export interface FileRecord {
  id: number;
  page_id: number;
  filename: string;
  mime_type: string;
  data: Buffer;
  created_at: Date;
}

export interface IngestLogEntry {
  id: number;
  source: string;
  slug: string;
  action: "created" | "updated" | "skipped";
  content_hash: string;
  created_at: Date;
}

export interface SearchResult {
  page: Page;
  score: number;
  chunk_text?: string;
  match_type: "keyword" | "vector" | "hybrid";
}

export interface SearchOptions {
  query: string;
  limit?: number;
  type_filter?: PageType[];
  tag_filter?: string[];
  include_timeline?: boolean;
}

export interface BrainStats {
  total_pages: number;
  pages_by_type: Record<PageType, number>;
  total_chunks: number;
  embedded_chunks: number;
  total_links: number;
  total_tags: number;
  total_timeline_entries: number;
}

export interface HealthReport {
  embed_coverage: number;
  stale_pages: number;
  orphan_pages: number;
  broken_links: number;
  last_dream_cycle: Date | null;
}

export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
  dimensions: number;
}
