# SHOGUN オンボーディング UX/UI 設計書

## 設計原則

1. **3分ルール**: オンボーディング全体を3分以内に完了
2. **即時フィードバック**: 各操作で即座に結果を表示
3. **スキップ可能**: 全ステップにスキップオプション
4. **ローカル安心**: データがローカルにのみ保存されることを明示
5. **プログレス可視化**: 進捗バーで残りステップを表示
6. **エラー復帰**: 失敗時は具体的な解決策を提示
7. **バイリンガル**: 全テキスト日英両対応

---

## フロー概要

```
5ステップ × 2ターゲット（エンドユーザー + 開発者）

エンドユーザー向け:
  Step 1: Welcome → Step 2: APIキー → Step 3: 初回メモリ
  → Step 4: 検索デモ → Step 5: 完了

開発者向け:
  Step 1: Welcome → Step 2: 環境構築 → Step 3: MCPセットアップ
  → Step 4: ツールテスト → Step 5: 完了
```

---

## エンドユーザー向けオンボーディング

### Step 1: Welcome (15秒)

**目的**: プロダクトの価値を一瞬で伝える

```
┌──────────────────────────────────────────────┐
│                                              │
│              🏯                               │
│           SHOGUN                             │
│                                              │
│    あなたのAIが、すべてを覚える               │
│    Your AI remembers everything              │
│                                              │
│    ┌──────────────────────────────────┐       │
│    │         はじめる / Get Started    │       │
│    └──────────────────────────────────┘       │
│                                              │
│    ● ○ ○ ○ ○                                 │
│                                              │
│    🔒 全データはあなたのマシンに保存されます    │
│       All data stays on your machine         │
└──────────────────────────────────────────────┘
```

**UI要素:**
- ブランドロゴ（アニメーション: フェードイン 0.5秒）
- タグライン（日英表示）
- CTA ボタン（プライマリカラー #e94560）
- ローカル安心バッジ（鍵アイコン + テキスト）
- プログレスインジケーター（5ドット）

### Step 2: API Key Setup (30秒)

**目的**: 最低限の設定でスタートできるようにする

```
┌──────────────────────────────────────────────┐
│  ← Step 2 of 5                               │
│                                              │
│  🔑 APIキーを設定 / Set Up API Keys           │
│                                              │
│  ┌─ OpenAI (ベクトル検索用) ──────────────┐   │
│  │                                        │   │
│  │  API Key                               │   │
│  │  ┌──────────────────────────────────┐  │   │
│  │  │ sk-...                            │  │   │
│  │  └──────────────────────────────────┘  │   │
│  │                                        │   │
│  │  💡 platform.openai.com/api-keys      │   │
│  └────────────────────────────────────────┘   │
│                                              │
│  ┌─ Anthropic (オプション) ───────────────┐   │
│  │  ▼ 展開してAPIキーを追加              │   │
│  └────────────────────────────────────────┘   │
│                                              │
│  ☐ スキップ（キーワード検索のみで開始）        │
│    Skip (start with keyword search only)      │
│                                              │
│  ⓘ キーはローカルにのみ保存され、              │
│    SHOGUNサーバーには送信されません             │
│                                              │
│  ┌──────────────────────────────────┐         │
│  │           次へ / Next →           │         │
│  └──────────────────────────────────┘         │
│                                              │
│  ● ● ○ ○ ○                                   │
└──────────────────────────────────────────────┘
```

**UXポイント:**
- APIキーはマスク表示（`sk-...xxxx`）
- 入力即時バリデーション（✅ 有効 / ❌ 無効）
- Anthropicは折りたたみ（オプション感を出す）
- スキップオプションは目立ちすぎないが見える位置
- ローカル保存の安心メッセージ

### Step 3: First Memory (60秒)

**目的**: 最初のメモリを作って「動いた！」体験を提供

```
┌──────────────────────────────────────────────┐
│  ← Step 3 of 5                               │
│                                              │
│  📝 最初のメモリを作ろう                      │
│     Create your first memory                 │
│                                              │
│  あなたの名前 / Your Name                     │
│  ┌──────────────────────────────────┐         │
│  │ Toru Yamamoto                     │         │
│  └──────────────────────────────────┘         │
│                                              │
│  何をしている？ / What do you do?             │
│  ┌──────────────────────────────────┐         │
│  │ SHOGUNを開発中。AIメモリの未来を  │         │
│  │ 作っています。                    │         │
│  └──────────────────────────────────┘         │
│                                              │
│  ┌─ Preview ─────────────────────────┐        │
│  │ 📄 people/toru-yamamoto           │        │
│  │                                    │        │
│  │ ---                               │        │
│  │ type: person                      │        │
│  │ title: Toru Yamamoto              │        │
│  │ ---                               │        │
│  │                                    │        │
│  │ SHOGUNを開発中。AIメモリの未来を   │        │
│  │ 作っています。                     │        │
│  └────────────────────────────────────┘        │
│                                              │
│  ┌──────────────────────────────────┐         │
│  │      作成する / Create Page  →    │         │
│  └──────────────────────────────────┘         │
│                                              │
│  ● ● ● ○ ○                                   │
└──────────────────────────────────────────────┘
```

**UXポイント:**
- リアルタイムプレビュー（入力→即座にMarkdown生成）
- slug自動生成（名前→`people/名前`）
- 作成ボタンクリック→ローディングアニメーション→✅完了
- 「作成完了！」のConfetti/パーティクルエフェクト

### Step 4: Search Demo (30秒)

**目的**: 検索が動くことを体験させる

```
┌──────────────────────────────────────────────┐
│  ← Step 4 of 5                               │
│                                              │
│  🔍 検索してみよう / Try a Search             │
│                                              │
│  ┌──────────────────────────────────┐         │
│  │ 🔍 Toru                           │         │
│  └──────────────────────────────────┘         │
│                                              │
│  ┌─ Search Results ──────────────────┐        │
│  │                                    │        │
│  │ 👤 Toru Yamamoto                  │        │
│  │    SHOGUNを開発中。AIメモリの...   │        │
│  │    score: 0.95 ⚡ keyword          │        │
│  │                                    │        │
│  └────────────────────────────────────┘        │
│                                              │
│  🎉 動いた！AIがあなたを覚えました            │
│     It works! AI remembers you               │
│                                              │
│  ┌──────────────────────────────────┐         │
│  │           次へ / Next →           │         │
│  └──────────────────────────────────┘         │
│                                              │
│  ● ● ● ● ○                                   │
└──────────────────────────────────────────────┘
```

**UXポイント:**
- 検索フィールドに自動フォーカス
- ユーザーの名前をプレースホルダーに自動入力
- 検索結果はリアルタイム表示
- 「動いた！」の成功メッセージとエフェクト

### Step 5: Complete (15秒)

**目的**: 次のステップへの道筋を示す

```
┌──────────────────────────────────────────────┐
│                                              │
│  🎉 セットアップ完了！                       │
│     Setup Complete!                          │
│                                              │
│  ┌─ Your Brain ──────────────────────┐        │
│  │ 📊 Pages:    1                    │        │
│  │ 📦 Chunks:   1                    │        │
│  │ 🔍 Search:   Ready ✅             │        │
│  │ 🌙 Dream:    Not configured       │        │
│  └────────────────────────────────────┘        │
│                                              │
│  次のステップ / Next Steps:                    │
│                                              │
│  ┌──────────────────────────────────┐         │
│  │ 🤖 Claude Desktopと連携          │         │
│  │    Connect Claude Desktop   →     │         │
│  └──────────────────────────────────┘         │
│  ┌──────────────────────────────────┐         │
│  │ 📖 ドキュメントを読む             │         │
│  │    Read documentation       →     │         │
│  └──────────────────────────────────┘         │
│  ┌──────────────────────────────────┐         │
│  │ 🌙 Dream Cycleを設定             │         │
│  │    Configure Dream Cycle    →     │         │
│  └──────────────────────────────────┘         │
│                                              │
│  ┌──────────────────────────────────┐         │
│  │    SHOGUNを使い始める →           │         │
│  │    Start using SHOGUN             │         │
│  └──────────────────────────────────┘         │
│                                              │
│  ● ● ● ● ●                                   │
└──────────────────────────────────────────────┘
```

---

## 開発者向けオンボーディング

### Step 1: Welcome
同じ（エンドユーザーと共通）

### Step 2: 環境構築

```
┌──────────────────────────────────────────────┐
│  ← Step 2 of 5                               │
│                                              │
│  💻 環境構築 / Environment Setup              │
│                                              │
│  ┌─ Terminal ────────────────────────┐        │
│  │ $ git clone https://github.com/   │        │
│  │   torutesu/shogun-ai.git          │        │
│  │ $ cd shogun-ai                    │        │
│  │ $ npm install                     │        │
│  │ $ cp .env.example .env            │        │
│  │ $ npm run build                   │        │
│  │ $ npm test                        │        │
│  │                                    │        │
│  │ ✅ 38/38 tests passing            │        │
│  └────────────────────────────────────┘        │
│  ┌──────┐                                     │
│  │ Copy │ クリップボードにコピー                │
│  └──────┘                                     │
│                                              │
│  ● ● ○ ○ ○                                   │
└──────────────────────────────────────────────┘
```

### Step 3: MCP Setup

Claude Desktop config の設定ガイド（JSON自動生成）

### Step 4: ツールテスト

MCPツールのインタラクティブテスト画面

### Step 5: Complete

Brain統計 + ドキュメントリンク

---

## デザインシステム

### カラーパレット

```css
:root {
  /* Primary */
  --color-primary: #e94560;        /* Shogun Red */
  --color-primary-light: #ff6b81;
  --color-primary-dark: #c73a52;

  /* Background */
  --color-bg-dark: #1a1a2e;        /* Deep Navy */
  --color-bg-card: #16213e;        /* Dark Blue */
  --color-bg-input: #0f3460;       /* Ocean Blue */

  /* Text */
  --color-text-primary: #f5f5f5;   /* Off White */
  --color-text-secondary: #a0a0b0; /* Muted */
  --color-text-accent: #e94560;    /* Red accent */

  /* Status */
  --color-success: #2ecc71;
  --color-warning: #f1c40f;
  --color-error: #e74c3c;

  /* Borders */
  --color-border: rgba(255, 255, 255, 0.1);
}
```

### タイポグラフィ

```css
/* Headings */
font-family: 'Inter', 'Noto Sans JP', sans-serif;
font-weight: 700;

/* Body */
font-family: 'Inter', 'Noto Sans JP', sans-serif;
font-weight: 400;

/* Code */
font-family: 'JetBrains Mono', monospace;

/* Sizes */
--font-size-hero: 2.5rem;    /* 40px */
--font-size-h1: 1.75rem;     /* 28px */
--font-size-h2: 1.25rem;     /* 20px */
--font-size-body: 1rem;      /* 16px */
--font-size-small: 0.875rem; /* 14px */
--font-size-code: 0.875rem;  /* 14px */
```

### スペーシング

```css
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;
--spacing-xxl: 48px;

/* カードパディング */
--card-padding: 16px;

/* セクション間隔 */
--section-gap: 32px;
```

### コンポーネント

```css
/* Button - Primary */
.btn-primary {
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: var(--font-size-body);
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

/* Card */
.card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: var(--card-padding);
}

/* Input */
.input {
  background: var(--color-bg-input);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 10px 14px;
  color: var(--color-text-primary);
  font-size: var(--font-size-body);
}

/* Progress Dots */
.progress-dots {
  display: flex;
  gap: 8px;
  justify-content: center;
}
.progress-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-border);
}
.progress-dot.active {
  background: var(--color-primary);
}
```

### アニメーション

```css
/* ページ遷移 */
.page-enter {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 成功エフェクト */
.success-pulse {
  animation: pulse 0.5s ease-out;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}
```

---

## アクセシビリティ

- 全てのインタラクティブ要素にキーボードナビゲーション
- スクリーンリーダー対応（aria-label、role属性）
- カラーコントラスト比 WCAG AA 以上
- フォーカスインジケーター明示
- 日本語・英語の言語タグ（lang属性）
