# Major Decisions

## 2026-04-14: Local-first with PGLite as default database
**Decision:** Use PGLite (Postgres WASM) as the primary local database, with Supabase as optional cloud sync target.
**Rationale:** The product's core promise is "your data never leaves your device." PGLite runs entirely in-process with no external server dependency. Users can search and capture offline. Supabase sync is additive — the app is fully functional without it.
**Alternatives considered:** SQLite (no pgvector), Supabase-only (cloud dependency), IndexedDB (no SQL).
**Status:** Active

## 2026-04-14: BYOK (Bring Your Own Key) for all LLM/Embedding APIs
**Decision:** Users supply their own OpenAI/Anthropic API keys. Zero LLM cost to Select KK.
**Rationale:** Sustainable unit economics from day one. $49/month subscription is pure margin. No inference cost scaling problem. Users who need local-only can use Ollama.
**Alternatives considered:** Managed API proxy (cost scaling risk), bundled API credits (margin erosion), local-only models (quality too low for search).
**Status:** Active

## 2026-04-14: Accessibility API text extraction over screenshot OCR
**Decision:** Primary capture method is macOS Accessibility API (AXUIElement via osascript), not screenshots.
**Rationale:** Text-only capture is faster (no image processing), more private (no visual data stored), more accurate (structured text vs OCR), and lower CPU. OCR is fallback only for apps that don't expose accessibility data.
**Alternatives considered:** Screenshot + Apple Vision OCR (Screenpipe approach — higher CPU, stores images), continuous screen recording (Rewind approach — massive storage).
**Status:** Active

## 2026-04-14: Hybrid search with RRF fusion (keyword + vector)
**Decision:** Combine tsvector full-text search with pgvector HNSW cosine similarity using Reciprocal Rank Fusion (K=60).
**Rationale:** Keyword search works without API keys (zero-cost baseline). Vector search adds semantic understanding when embedding provider is available. RRF fusion gives best-of-both results. 4-layer dedup prevents redundant results.
**Alternatives considered:** Vector-only (requires API key), keyword-only (no semantic understanding), re-ranking with LLM (too slow for interactive search).
**Status:** Active

## 2026-04-14: Page-based memory model (compiled truth + append-only timeline)
**Decision:** Memory is organized as Pages (slug-addressed documents) with two sections: compiled truth (overwritten on update) and timeline (append-only evidence log).
**Rationale:** Inspired by GBrain. Compiled truth gives the AI a single "current understanding" to reference. Timeline preserves raw observations for audit and reprocessing. Auto-versioning captures every compiled truth change.
**Alternatives considered:** Event-sourced log only (hard to summarize), document store without timeline (loses provenance), graph-only (no narrative structure).
**Status:** Active

## 2026-04-14: Tauri (Rust + React) for desktop app
**Decision:** Use Tauri v2 for the desktop application, with a Rust capture layer and React frontend.
**Rationale:** Single binary distribution (~20MB vs Electron's ~200MB). Native macOS integration via Rust (Accessibility API, system audio). WebView for UI keeps the React ecosystem. Rust capture runs in-process without Node.js dependency.
**Alternatives considered:** Electron (bloated), Swift native (no cross-platform), Flutter (weak desktop).
**Status:** Active

## 2026-04-14: HTTP bridge between Tauri and Memory Engine
**Decision:** The Node.js Memory Engine runs as an HTTP server (localhost:3847), not as a stdio sidecar.
**Rationale:** stdio JSON-RPC was unreliable when spawned as a Tauri child process (CWD issues, stdin/stdout lockups). HTTP is debuggable, testable independently, and works for the browser extension too.
**Alternatives considered:** stdio JSON-RPC (unreliable), direct FFI (too complex), embedding Node in Rust (napi — build complexity).
**Status:** Active — supersedes the stdio approach from 2026-04-14.

## 2026-04-15: L1/L2/L3 agent autonomy levels
**Decision:** All agent actions are classified into three levels: L1 (auto-execute), L2 (propose → approve with 30s timeout), L3 (explicit confirmation required).
**Rationale:** Users need trust in the system. L1 handles safe operations (tagging, indexing). L2 lets the AI propose but the human decides (drafts, task adds). L3 gates irreversible actions (sending emails, posting). This maps to the Granola/Notion AI pattern users already understand.
**Alternatives considered:** No levels (everything auto — dangerous), all confirmation (too slow), binary auto/manual (too coarse).
**Status:** Active

## 2026-04-15: Clerk + Supabase + Stripe for cloud services
**Decision:** Authentication via Clerk (free tier), cloud sync via Supabase (PostgreSQL + pgvector), billing via Stripe. All maximize free tiers.
**Rationale:** Zero infrastructure cost through PMF. Clerk handles auth complexity (OAuth, MFA, user management) for free up to 10K MAU. Supabase provides the same PostgreSQL schema as local PGLite — zero migration cost. Stripe handles subscription lifecycle.
**Alternatives considered:** Self-hosted auth (engineering overhead), Firebase (vendor lock-in), custom billing (unnecessary complexity).
**Status:** Active
