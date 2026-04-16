# SHOGUN Agent Infrastructure

## Memory
- `memory/working/WORKSPACE.md` — 現在のタスク状態（最初に読む）
- `memory/semantic/LESSONS.md` — 抽出済みパターン（意思決定前に読む）
- `memory/semantic/DECISIONS.md` — 過去の主要決定と理由
- `memory/personal/PREFERENCES.md` — ユーザーの好み・スタイル

## Skills
- `.agent/skills/_index.md` — トリガーマッチのみフルロード

## Data
- PGLite: 11テーブル（pages, content_chunks, links, tags, timeline_entries, page_versions, raw_data, files, ingest_log, embedding_cache, dream_cycle_log）
- MCP Server: 20ツール（read 10 / write 7 / admin 3）
- Bridge HTTP: localhost:3847（全操作はREST API経由）

## Protocols
- `.agent/protocols/permissions.md` — ツール呼び出し前に必ず確認
- L1: 自動実行（tag, index, summarize）
- L2: 提案→30秒承認（draft, task, meeting notes）
- L3: 明示確認（send, post, calendar create）

## Rules
1. 過去に指摘・修正された決定は必ず `DECISIONS.md` を先に確認
2. 重要な行動はエピソードメモリに記録（timeline_entries）
3. `WORKSPACE.md` を作業中に常時更新
4. permissions のブロックは絶対遵守
5. スキルのセルフリライトは保守的に行う — 既存テスト131件が壊れないこと
