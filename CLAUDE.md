# SHOGUN Memory Layer

## Project Overview

Local-first, AI-native memory system embedded inside SHOGUN (syogun.com).
The core component that makes SHOGUN "the AI that remembers and acts on everything you do."

## Tech Stack

- **Memory Engine**: TypeScript + PGLite (local Postgres WASM)
- **Search**: pgvector HNSW + tsvector + RRF fusion
- **Embeddings**: OpenAI text-embedding-3-large (BYOK)
- **LLM**: Claude API / GPT API (BYOK)
- **MCP Server**: 21 tools for AI agent integration
- **Desktop**: Tauri (Rust + React) — future phase

## Quick Start

```bash
npm install
npm run build
npm test
```

## Architecture

See the parent CLAUDE.md for full architecture documentation.
