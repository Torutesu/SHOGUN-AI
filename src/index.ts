// SHOGUN Memory Layer — Core exports
export { ShogunBrain } from "./brain.js";
export type { ShogunBrainOptions } from "./brain.js";

// Engine
export { PostgresEngine } from "./engine/index.js";

// Memory stores
export { PageStore, TimelineStore, LinkStore, TagStore } from "./memory/index.js";

// Chunking
export { recursiveChunk, semanticChunk } from "./chunking/index.js";

// Embeddings
export { OpenAIEmbeddingProvider } from "./embeddings/index.js";

// Search
export { SearchPipeline, KeywordSearch, VectorSearch, rrfFusion, dedup } from "./search/index.js";

// Dream Cycle
export { DreamCycle, scheduleDreamCycle } from "./dream/index.js";

// MCP
export { startMCPServer } from "./mcp/index.js";

// Types
export type {
  Page,
  PageInput,
  PageType,
  ContentChunk,
  Link,
  Tag,
  TimelineEntry,
  PageVersion,
  SearchResult,
  SearchOptions,
  BrainStats,
  HealthReport,
  EmbeddingProvider,
} from "./types.js";
