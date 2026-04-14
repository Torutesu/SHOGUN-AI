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
export { OpenAIEmbeddingProvider, CachedEmbeddingProvider, TieredEmbeddingProvider } from "./embeddings/index.js";

// LLM Router
export { LLMRouter, createClaudeProvider, createOpenAIProvider } from "./llm/index.js";
export type { LLMProvider, TaskComplexity } from "./llm/index.js";

// Search
export { SearchPipeline, KeywordSearch, VectorSearch, rrfFusion, dedup } from "./search/index.js";

// Dream Cycle
export { DreamCycle, scheduleDreamCycle } from "./dream/index.js";

// Logger
export { logger } from "./logger.js";

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
