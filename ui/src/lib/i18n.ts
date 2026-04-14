import { createContext, useContext } from "react";

export type Lang = "ja" | "en";

export const LangContext = createContext<Lang>("ja");

export function useLang(): Lang {
  return useContext(LangContext);
}

type Translations = Record<string, { ja: string; en: string }>;

const T: Translations = {
  // Navigation
  "nav.dashboard": { ja: "ダッシュボード", en: "Dashboard" },
  "nav.ask": { ja: "メモリに聞く", en: "Ask Memory" },
  "nav.search": { ja: "検索", en: "Search" },
  "nav.settings": { ja: "設定", en: "Settings" },

  // Dashboard
  "dash.greeting.morning": { ja: "おはようございます", en: "Good morning" },
  "dash.greeting.afternoon": { ja: "こんにちは", en: "Good afternoon" },
  "dash.greeting.evening": { ja: "こんばんは", en: "Good evening" },
  "dash.memories": { ja: "件のメモリがインデックス済み", en: "memories indexed" },
  "dash.first": { ja: "最初のメモリを作りましょう", en: "Let's build your first memory" },
  "dash.health": { ja: "Brain ヘルス", en: "Brain Health" },
  "dash.actions": { ja: "アクション", en: "Actions" },
  "dash.ask": { ja: "メモリに聞く", en: "Ask Memory" },
  "dash.ask.sub": { ja: "AIが記憶を使って回答", en: "Chat with your brain" },
  "dash.search": { ja: "検索", en: "Search" },
  "dash.search.sub": { ja: "全文+意味検索", en: "Full-text + semantic" },
  "dash.dream": { ja: "Dream Cycle", en: "Dream Cycle" },
  "dash.dream.sub": { ja: "同期・整理・ヘルスチェック", en: "Sync, embed, health check" },
  "dash.dream.running": { ja: "実行中...", en: "Running..." },
  "dash.dream.done": { ja: "✓ 完了", en: "✓ Complete" },
  "dash.capturing": { ja: "キャプチャ中", en: "Capturing" },
  "dash.paused": { ja: "一時停止", en: "Paused" },

  // Chat
  "chat.title": { ja: "メモリに聞く", en: "Ask Memory" },
  "chat.subtitle": { ja: "AIが記憶を検索して回答します", en: "Your memory, searchable by conversation" },
  "chat.placeholder": { ja: "メモリに質問...", en: "Ask your memory..." },
  "chat.send": { ja: "送信", en: "Send" },
  "chat.empty": { ja: "何でも聞いてください", en: "Ask anything about your memory" },

  // Search
  "search.title": { ja: "検索", en: "Search" },
  "search.placeholder": { ja: "何でも検索...", en: "Search anything..." },
  "search.results": { ja: "件の結果", en: "results" },
  "search.empty": { ja: "キーワードまたは自然言語で検索", en: "Keyword or natural language query" },
  "search.none": { ja: "結果なし", en: "No results found" },

  // Settings
  "settings.title": { ja: "設定", en: "Settings" },
  "settings.save": { ja: "保存", en: "Save Settings" },
  "settings.saved": { ja: "✓ 保存しました", en: "✓ Saved" },
  "settings.saving": { ja: "保存中...", en: "Saving..." },
  "settings.restart": { ja: "再起動後に反映されます", en: "Requires restart" },

  // Page
  "page.edit": { ja: "編集", en: "Edit" },
  "page.delete": { ja: "削除", en: "Delete" },
  "page.delete.confirm": { ja: "このページを削除しますか？", en: "Delete this page?" },
  "page.notfound": { ja: "ページが見つかりません", en: "Page not found" },
  "page.back": { ja: "← 戻る", en: "← Back" },
  "page.truth": { ja: "コンパイルされた真実", en: "Compiled Truth" },
  "page.timeline": { ja: "タイムライン", en: "Timeline" },
  "page.title": { ja: "タイトル", en: "Title" },
  "page.type": { ja: "タイプ", en: "Type" },
  "page.tags": { ja: "タグ（カンマ区切り）", en: "Tags (comma-separated)" },
  "page.save": { ja: "保存", en: "Save" },
  "page.saving": { ja: "保存中...", en: "Saving..." },
  "page.cancel": { ja: "キャンセル", en: "Cancel" },
  "page.editing": { ja: "編集中", en: "Editing" },

  // Dashboard metrics
  "metric.pages": { ja: "ページ", en: "Pages" },
  "metric.chunks": { ja: "チャンク", en: "Chunks" },
  "metric.links": { ja: "リンク", en: "Links" },
  "metric.events": { ja: "イベント", en: "Events" },
  "metric.coverage": { ja: "埋め込みカバレッジ", en: "Embed Coverage" },
  "metric.stale": { ja: "古いページ", en: "Stale" },
  "metric.orphans": { ja: "孤立ページ", en: "Orphans" },

  // Chat
  "chat.sources": { ja: "ソース", en: "Sources" },
  "chat.error": { ja: "失敗しました — Settingsでキーを確認してください", en: "Failed — check API keys in Settings" },

  // Settings sections
  "settings.apikeys": { ja: "APIキー", en: "API Keys" },
  "settings.embedding": { ja: "埋め込み", en: "Embedding" },
  "settings.tier": { ja: "ティア", en: "Tier" },
  "settings.storage": { ja: "ストレージ・セキュリティ", en: "Storage & Security" },
  "settings.datadir": { ja: "データディレクトリ", en: "Data Directory" },
  "settings.encryption": { ja: "暗号化", en: "Encryption" },
  "settings.encryption.sub": { ja: "AES-256-GCM · 再起動後に反映", en: "AES-256-GCM · Requires restart" },
  "settings.capture": { ja: "キャプチャ", en: "Capture" },
  "settings.dreamcycle": { ja: "自動実行", en: "Auto-run" },
  "settings.dreamcycle.sub": { ja: "毎日 00:00 JST に Dream Cycle を実行", en: "Run Dream Cycle daily at 00:00 JST" },
  "settings.language": { ja: "言語", en: "Language" },
  "settings.tier.fast": { ja: "Fast (256次元) — 最速", en: "Fast (256 dims) — fastest" },
  "settings.tier.balanced": { ja: "Balanced (1536次元) — バランス", en: "Balanced (1536 dims)" },
  "settings.tier.full": { ja: "Full (3072次元) — 最高精度", en: "Full (3072 dims) — highest" },

  // Onboarding
  "onboard.start": { ja: "はじめる", en: "Get Started" },
  "onboard.next": { ja: "次へ", en: "Next" },
  "onboard.skip": { ja: "スキップ — キーワード検索のみ", en: "Skip — keyword search only" },
  "onboard.done": { ja: "SHOGUNを使い始める", en: "Start using SHOGUN" },
  "onboard.local": { ja: "全データはあなたのデバイスに保存されます", en: "All data stays on your device" },
  "onboard.ready": { ja: "準備完了", en: "Ready" },
  "onboard.ready.sub": { ja: "SHOGUNのセットアップが完了しました", en: "SHOGUN is set up and running" },
  "onboard.apikeys": { ja: "APIキー", en: "API Keys" },
  "onboard.apikeys.hint": { ja: "キーはローカルにのみ保存されます", en: "Keys are stored locally only" },
  "onboard.firstmemory": { ja: "最初のメモリを作る", en: "Create your first memory" },
  "onboard.name": { ja: "あなたの名前", en: "Your name" },
  "onboard.whatdo": { ja: "何をしていますか？", en: "What do you do?" },
  "onboard.creating": { ja: "作成中...", en: "Creating..." },
  "onboard.created": { ja: "✓ 作成完了", en: "✓ Created" },
  "onboard.createpage": { ja: "ページを作成", en: "Create Page" },
  "onboard.trysearch": { ja: "検索を試す", en: "Try a search" },
  "onboard.noresults": { ja: "まだ結果なし", en: "No results yet" },
  "onboard.back": { ja: "← 戻る", en: "← Back" },

  // Spotlight
  "spotlight.placeholder": { ja: "メモリを検索...", en: "Search memory..." },
  "spotlight.noresults": { ja: "結果なし", en: "No results" },
};

export function t(key: string, lang: Lang): string {
  const entry = T[key];
  if (!entry) return key;
  return entry[lang];
}
