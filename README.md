<div align="center">

# SHOGUN Memory Layer

**The AI that remembers everything you do.**

ローカルファーストの AI ネイティブメモリシステム — [syogun.com](https://syogun.com)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![PGLite](https://img.shields.io/badge/PGLite-WASM-green)](https://pglite.dev/)
[![License](https://img.shields.io/badge/License-Proprietary-red)]()
[![Tests](https://img.shields.io/badge/Tests-38%20passing-brightgreen)]()

</div>

---

## What is SHOGUN?

SHOGUN は、画面上のあらゆる情報を記憶し、AI が自動的に構造化・検索可能にするデスクトップアプリです。

```
あなたが見たもの → キャプチャ → 構造化メモリ → AI が活用
```

### Why SHOGUN?

| 既存ソリューション | 問題点 | SHOGUN |
|---|---|---|
| Screenpipe | ビルド必要・有料プラグイン・不安定 | ワンクリックインストール |
| Rewind AI | クラウド依存・プライバシー懸念 | 全データローカル保存 |
| Notion AI / Obsidian | 手動入力が必要 | 自動キャプチャ |
| Apple Intelligence | エコシステム限定 | クロスプラットフォーム |

---

## Quick Start

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
git clone https://github.com/torutesu/shogun-ai.git
cd shogun-ai
npm install
```

### Build & Test

```bash
npm run build       # TypeScript コンパイル
npm test            # 全テスト実行 (38 tests)
npm run typecheck   # 型チェック
```

### MCP Server (Claude Desktop 連携)

```bash
# 環境変数を設定
export OPENAI_API_KEY="your-key-here"
export SHOGUN_DATA_DIR="./pgdata"

# MCP サーバー起動
npm run start:mcp
```

#### Claude Desktop 設定 (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "shogun-memory": {
      "command": "node",
      "args": ["dist/mcp/server.js"],
      "env": {
        "OPENAI_API_KEY": "your-key-here",
        "SHOGUN_DATA_DIR": "./pgdata"
      }
    }
  }
}
```

---

## Architecture

```
SHOGUN Memory Layer
│
├── Engine Layer (PGLite)
│   ├── 9-table schema with auto-migrations
│   ├── pgvector for embeddings (3072 dims)
│   └── tsvector triggers for full-text search
│
├── Memory Layer (TypeScript)
│   ├── Pages (CRUD + SHA-256 idempotency)
│   ├── Timeline (append-only evidence log)
│   ├── Links (bidirectional graph)
│   ├── Tags (many-to-many)
│   └── Versions (auto-snapshot on update)
│
├── Search Pipeline
│   ├── Keyword search (tsvector + ts_rank)
│   ├── Vector search (HNSW cosine similarity)
│   ├── RRF Fusion (K=60)
│   ├── Multi-query expansion
│   └── 4-layer deduplication
│
├── MCP Server (20 tools)
│   ├── Read (10): get_page, list_pages, search, query, ...
│   ├── Write (7): put_page, delete_page, add_tag, ...
│   └── Admin (3): revert_version, sync_brain, dream_cycle
│
└── Dream Cycle (nightly batch)
    ├── Sync stale pages
    ├── Embed missing chunks
    └── Health check
```

---

## Page Format

SHOGUN のメモリは **Page** 単位で管理されます。

```markdown
---
type: person
title: Toru Yamamoto
tags: [founder, tokyo, ai]
---

Select KK founder. Building SHOGUN — an AI OS combining
local screen capture with persistent world memory.

---

- 2025-01-15: Founded Select KK
- 2025-06-01: Launched SHOGUN beta
- 2026-04-14: Memory Layer architecture finalized
```

- `---` より上: **compiled truth** (現時点の要約、上書き更新)
- `---` より下: **timeline** (証拠ログ、追記のみ)

### Page Types

| Type | Slug Pattern | Example |
|---|---|---|
| `person` | `people/name` | `people/toru-yamamoto` |
| `company` | `companies/name` | `companies/select-kk` |
| `session` | `sessions/date` | `sessions/2026-04-14` |
| `concept` | `concepts/name` | `concepts/memory-layer` |

---

## MCP Tools Reference

### Read Tools

| Tool | Description |
|---|---|
| `get_page` | slug でページ取得 |
| `list_pages` | type/tag フィルター付きリスト |
| `search` | キーワード全文検索 |
| `query` | ハイブリッド検索（フルパイプライン） |
| `get_timeline` | ページのタイムライン取得 |
| `get_backlinks` | 被リンクページ取得 |
| `traverse_graph` | リンクグラフ走査（深さ N） |
| `get_stats` | Brain 統計情報 |
| `get_health` | ヘルスレポート |
| `get_versions` | バージョン履歴 |

### Write Tools

| Tool | Description |
|---|---|
| `put_page` | ページ作成/更新（自動バージョニング） |
| `delete_page` | ページ削除 |
| `add_tag` | タグ追加 |
| `remove_tag` | タグ削除 |
| `add_link` | リンク作成 |
| `remove_link` | リンク削除 |
| `add_timeline_entry` | タイムラインエントリ追加 |

### Admin Tools

| Tool | Description |
|---|---|
| `revert_version` | 前バージョンへの巻き戻し |
| `sync_brain` | 差分同期（チャンク+埋め込み） |
| `dream_cycle` | Dream Cycle 手動実行 |

---

## Search Pipeline

```
ユーザークエリ
    │
マルチクエリ展開（Heuristic / LLM）
    │
    ├── ベクトル検索（HNSW cosine similarity）
    └── キーワード検索（tsvector + ts_rank）
    │
RRF Fusion: score = Σ 1/(60 + rank)
    │
4層重複排除
  1. ページごとの最高スコアチャンク
  2. コサイン類似度 > 0.85 の除外
  3. タイプ多様性（60% キャップ）
  4. ページごとのチャンク上限
    │
検索結果（stale アラート付き）
```

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | No* | — | OpenAI API キー（ベクトル検索に必要） |
| `SHOGUN_DATA_DIR` | No | `memory://` | PGLite データディレクトリ |

*ベクトル検索なしでもキーワード検索は動作します。

---

## Development

```bash
npm run dev          # TypeScript watch mode
npm run test:watch   # テスト watch mode
npm run typecheck    # 型チェック
npm run lint         # ESLint
```

### Project Structure

```
src/
├── brain.ts              # 中央コーディネーター
├── types.ts              # 型定義
├── engine/               # PGLite データベースエンジン
│   ├── postgres.ts       # PostgresEngine クラス
│   └── migrations.ts     # スキーママイグレーション
├── memory/               # メモリ操作
│   ├── pages.ts          # ページ CRUD
│   ├── timeline.ts       # タイムライン
│   ├── links.ts          # リンクグラフ
│   └── tags.ts           # タグ管理
├── chunking/             # テキストチャンキング
│   ├── recursive.ts      # 再帰的分割
│   └── semantic.ts       # セマンティック分割
├── embeddings/           # 埋め込みプロバイダー
│   └── openai.ts         # OpenAI text-embedding-3-large
├── search/               # 検索パイプライン
│   ├── keyword.ts        # tsvector 全文検索
│   ├── vector.ts         # HNSW ベクトル検索
│   ├── fusion.ts         # RRF 融合
│   ├── dedup.ts          # 4層重複排除
│   ├── expansion.ts      # クエリ展開
│   └── pipeline.ts       # 統合パイプライン
├── mcp/                  # MCP サーバー
│   ├── server.ts         # サーバー本体
│   └── tools/            # 20 ツール定義
├── dream/                # Dream Cycle
│   └── cycle.ts          # 夜間バッチ
└── index.ts              # パブリック API
```

---

## License

Proprietary - SHOGUN by Select KK. All rights reserved.
