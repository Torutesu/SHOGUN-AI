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
export { PassiveCaptureEngine, OCRCaptureEngine, AudioCaptureEngine, AdaptiveCaptureController } from "./capture/index.js";
export type { CaptureEvent, PassiveCaptureOptions, OCRResult, TranscriptSegment, SystemState } from "./capture/index.js";

// Agents (L1/L2/L3)
export { classifyActionLevel, ApprovalQueue } from "./agents/index.js";
export type { AgentLevel, AgentAction } from "./agents/index.js";

// Timeline
export { TimelineService } from "./memory/timeline-service.js";
export type { TimelineDay } from "./memory/timeline-service.js";

// Chat
export { ChatEngine } from "./chat/index.js";
export type { ChatMessage, ChatOptions } from "./chat/index.js";

// Actions
export { ActionEngine, BUILTIN_ACTIONS } from "./actions/index.js";
export type { Action, ActionTrigger, ActionStep } from "./actions/index.js";

// Billing
export { StripeBilling } from "./billing/index.js";
export type { SubscriptionStatus, StripeBillingOptions } from "./billing/index.js";

// Security
export {
  FieldEncryption, EncryptedFieldWrapper,
  PIIFilter, detectPII, removePII, containsPII,
  RateLimiter,
  slugSchema, dateSchema, tagSchema, sanitizeDataDir, sanitizeError,
  KeychainManager, AuditLog,
  isBiometricAvailable, registerBiometric, verifyBiometric,
} from "./security/index.js";
export type { AuditEntry } from "./security/index.js";

// Tiered Memory
export { TieredMemory, getPageTier, getTierBoost } from "./memory/tiered-memory.js";
export type { MemoryTier } from "./memory/tiered-memory.js";
export type { PIIDetection, PIIFilterOptions } from "./security/index.js";

// Integrations
export {
  SlackIntegration, GitHubIntegration, GoogleCalendarIntegration, BrainExporter,
  OAuthTokenManager, createGoogleOAuth, createSlackOAuth, createGitHubOAuth,
  paginatedFetch,
} from "./integrations/index.js";
export type { OAuthConfig, OAuthTokens } from "./integrations/index.js";

// Identity
export { SHOGUN_IDENTITY, SYSTEM_PROMPTS, getGreeting, getMemoryInsight } from "./identity.js";

// Growth
export { ViralEngine, calculateIntelligenceScore } from "./growth/index.js";
export type { ShareableCard } from "./growth/index.js";

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
