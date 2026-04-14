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
export { SearchPipeline, KeywordSearch, VectorSearch, rrfFusion, dedup, JapaneseSearchEnhancer } from "./search/index.js";

// Dream Cycle
export { DreamCycle, scheduleDreamCycle, EntityExtractor, MemoryConsolidator } from "./dream/index.js";

// Capture
export { PassiveCaptureEngine } from "./capture/index.js";
export type { CaptureEvent, PassiveCaptureOptions } from "./capture/index.js";

// Security
export {
  FieldEncryption, EncryptedFieldWrapper,
  PIIFilter, detectPII, removePII, containsPII,
  RateLimiter,
  slugSchema, dateSchema, tagSchema, sanitizeDataDir, sanitizeError,
} from "./security/index.js";
export type { PIIDetection, PIIFilterOptions } from "./security/index.js";

// Integrations
export {
  SlackIntegration, GitHubIntegration, GoogleCalendarIntegration, BrainExporter,
  OAuthTokenManager, createGoogleOAuth, createSlackOAuth, createGitHubOAuth,
  paginatedFetch,
} from "./integrations/index.js";
export type { OAuthConfig, OAuthTokens } from "./integrations/index.js";

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
