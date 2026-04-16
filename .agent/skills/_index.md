# Skill Index

セッション開始時にこのファイルのみ読む。トリガーにマッチした場合のみ対応ツールをフルロードする。

## Read Skills

| Skill | MCP Tool | Description | Triggers |
|-------|----------|-------------|----------|
| memory-get | `get_page` | slugでページ取得 | "見せて", "教えて", slug直指定 |
| memory-list | `list_pages` | ページ一覧取得 | "一覧", "リスト", "全部" |
| memory-search | `search` | キーワード全文検索 | "検索", "探して", "search" |
| memory-query | `query` | ハイブリッド検索（ベクトル+キーワード） | "覚えてる", "前回", "履歴", 自然言語質問 |
| memory-timeline | `get_timeline` | タイムラインエントリ取得 | "いつ", "時系列", "経緯" |
| memory-backlinks | `get_backlinks` | 被リンクページ取得 | "関連", "つながり", "参照元" |
| memory-graph | `traverse_graph` | リンクグラフ走査 | "グラフ", "関係図", "depth" |
| memory-stats | `get_stats` | Brain統計 | "統計", "ステータス", "stats" |
| memory-health | `get_health` | ヘルスレポート | "健康", "health", "カバレッジ" |
| memory-versions | `get_versions` | バージョン履歴 | "バージョン", "履歴", "変更" |

## Write Skills

| Skill | MCP Tool | Description | Triggers |
|-------|----------|-------------|----------|
| memory-put | `put_page` | ページ作成/更新 | "作成", "記録", "保存", "put" |
| memory-delete | `delete_page` | ページ削除 | "削除", "消して", "delete" |
| memory-tag | `add_tag` | タグ追加 | "タグ", "ラベル", "tag" |
| memory-untag | `remove_tag` | タグ削除 | "タグ外す", "untag" |
| memory-link | `add_link` | リンク作成 | "リンク", "関連づけ", "link" |
| memory-unlink | `remove_link` | リンク削除 | "リンク外す", "unlink" |
| memory-timeline-add | `add_timeline_entry` | タイムライン追記 | "記録", "ログ", "追記" |

## Admin Skills

| Skill | MCP Tool | Description | Triggers |
|-------|----------|-------------|----------|
| memory-revert | `revert_version` | バージョン巻き戻し | "戻して", "revert", "undo" |
| memory-sync | `sync_brain` | 差分同期 | "同期", "sync", "再インデックス" |
| dream-cycle | `dream_cycle` | メモリ圧縮・整理・ヘルスチェック | "整理", "まとめ", "dream", "夜間バッチ" |
