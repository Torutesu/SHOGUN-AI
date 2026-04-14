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

  // Onboarding
  "onboard.start": { ja: "はじめる", en: "Get Started" },
  "onboard.next": { ja: "次へ", en: "Next" },
  "onboard.skip": { ja: "スキップ", en: "Skip" },
  "onboard.done": { ja: "SHOGUNを使い始める", en: "Start using SHOGUN" },
  "onboard.local": { ja: "全データはあなたのデバイスに保存されます", en: "All data stays on your device" },
};

export function t(key: string, lang: Lang): string {
  const entry = T[key];
  if (!entry) return key;
  return entry[lang];
}
