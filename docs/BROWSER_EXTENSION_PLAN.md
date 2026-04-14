# SHOGUN ブラウザ拡張 + 連携ツール企画

## ブラウザ拡張（Chrome / Firefox / Safari）

### 概要

ブラウザ上の活動をリアルタイムでSHOGUNメモリに取り込む拡張機能。
デスクトップアプリのパッシブキャプチャを補完し、Web上の行動を網羅する。

### コア機能（v1 — リリース同時）

| 機能 | 説明 | 優先度 |
|---|---|---|
| **ページタイトル+URL自動記録** | 閲覧したページのタイトルとURLをセッションページに記録 | P0 |
| **テキスト選択→メモリ保存** | 右クリックメニュー「SHOGUNに保存」で選択テキストを保存 | P0 |
| **クリップボードキャプチャ（Web）** | ブラウザ内コピー操作を検知してメモリに追加 | P1 |
| **タブ切替トラッキング** | アクティブタブの切替をタイムラインに記録 | P1 |
| **サイドパネル検索** | 拡張のサイドパネルからSHOGUN検索 | P1 |

### v2 拡張機能（リリース後1ヶ月）

| 機能 | 説明 |
|---|---|
| **Gmail 連携** | メール本文・件名・送信者を自動取り込み |
| **Google Docs 連携** | ドキュメント編集内容のサマリーを記録 |
| **YouTube 字幕取り込み** | 視聴動画の字幕テキストをメモリに保存 |
| **LinkedIn プロフィール** | 閲覧したプロフィールから自動で人物ページ作成 |
| **Twitter/X 取り込み** | 自分のツイート・ブックマークを記録 |

### 技術スタック

```
browser-extension/
├── manifest.json          # Manifest V3 (Chrome/Firefox互換)
├── background.ts          # Service Worker (イベント処理)
├── content.ts             # Content Script (ページDOM操作)
├── sidepanel.html         # サイドパネルUI (React)
├── popup.html             # ポップアップUI
├── options.html           # 設定ページ
└── lib/
    ├── shogun-client.ts   # SHOGUN API クライアント
    ├── capture.ts         # キャプチャロジック
    └── pii-filter.ts      # ブラウザ用PIIフィルタ
```

### 通信方式

```
ブラウザ拡張 → Native Messaging → Tauriアプリ → Bridge → ShogunBrain
              (Chrome native messaging protocol)

OR

ブラウザ拡張 → HTTP localhost:PORT → MCPサーバー → ShogunBrain
              (HTTP transport MCPの場合)
```

**推奨: Native Messaging** — ローカル通信のみ、外部ネットワーク不要。

### PII保護

ブラウザ拡張にもPIIフィルターを搭載:
- パスワード入力フィールドを自動除外 (`type="password"`)
- 銀行サイト・決済サイトを自動除外（URLパターンマッチ）
- クレジットカード番号検出
- フィルターはブラウザ側で適用（データがアプリに到達する前）

### 除外リスト（デフォルト）

```
# 自動除外するURL/ドメイン
*.bank.*
*.credit.*
banking.*
pay.google.com
wallet.google.com
paypal.com
stripe.com
venmo.com
chrome://settings/*
about:*
```

---

## 連携ツール — Phase別ロードマップ

### Phase 1: リリース同時（現在の3つ + 4つ追加 = 7連携）

| ツール | 取り込み内容 | 優先度 | 理由 |
|---|---|---|---|
| **Slack** ✅ | チャンネルメッセージ、DM | 実装済 | チーム連携の基盤 |
| **GitHub** ✅ | Issue、PR、コミット | 実装済 | 開発者コア |
| **Google Calendar** ✅ | イベント、出席者 | 実装済 | スケジュール基盤 |
| **Gmail** | メール件名・本文・送信者 | P0 | ビジネスの最重要通信手段 |
| **Notion** | ページ・データベース | P0 | ナレッジ管理の移行元 |
| **Linear** | Issue・プロジェクト | P1 | スタートアップの標準PM |
| **Zoom/Google Meet** | ミーティングサマリー(Webhook) | P1 | 会議記録の需要高 |

### Phase 2: リリース後1ヶ月（+6 = 13連携）

| ツール | 取り込み内容 |
|---|---|
| **Jira** | Issue・スプリント・エピック |
| **Confluence** | Wiki ページ |
| **Microsoft Teams** | メッセージ・チャネル |
| **Outlook** | メール・カレンダー |
| **Figma** | デザインファイルのコメント・変更履歴 |
| **Salesforce** | 顧客情報・商談・活動 |

### Phase 3: リリース後3ヶ月（+7 = 20連携）

| ツール | 取り込み内容 |
|---|---|
| **HubSpot** | CRM・マーケティング |
| **Intercom** | カスタマーサポート |
| **Stripe** | 支払い・顧客（ビジネスメモリ） |
| **Twitter/X** | ツイート・ブックマーク |
| **Discord** | サーバーメッセージ |
| **Airtable** | レコード・テーブル |
| **Zapier Webhook** | 汎用連携（任意サービス） |

### 連携アーキテクチャ

```
各連携は同一パターン:
1. OAuthTokenManager でトークン管理（リフレッシュ自動）
2. paginatedFetch でページネーション + レート制限
3. ShogunBrain に put_page / add_timeline_entry
4. PIIFilter 適用済みテキストのみ保存

src/integrations/
├── oauth.ts              # 共通OAuth基盤 ✅
├── paginated-fetch.ts    # 共通ページネーション ✅
├── slack.ts              # ✅ 実装済
├── github.ts             # ✅ 実装済
├── google-calendar.ts    # ✅ 実装済
├── gmail.ts              # Phase 1
├── notion.ts             # Phase 1
├── linear.ts             # Phase 1
├── zoom.ts               # Phase 1
├── jira.ts               # Phase 2
├── confluence.ts         # Phase 2
├── ms-teams.ts           # Phase 2
├── outlook.ts            # Phase 2
├── figma.ts              # Phase 2
├── salesforce.ts         # Phase 2
└── webhook.ts            # Phase 3 (Zapier汎用)
```

### 各連携の共通インターフェース

```typescript
interface Integration {
  name: string;
  // OAuth設定
  getOAuthConfig(): OAuthConfig;
  // データ取り込み
  ingest(brain: ShogunBrain, options?: IngestOptions): Promise<IngestResult>;
  // 利用可能チェック
  isConfigured(): boolean;
}

interface IngestResult {
  pages_created: number;
  pages_updated: number;
  timeline_entries: number;
  errors: string[];
}
```

---

## 実装スケジュール

| 週 | 内容 |
|---|---|
| Week 1 | ブラウザ拡張 v1（タイトル記録 + テキスト選択保存 + サイドパネル） |
| Week 2 | Gmail + Notion 連携 |
| Week 3 | Linear + Zoom 連携 |
| Week 4 | テスト + ドキュメント + Chrome Web Store 申請 |

### 注意事項

- Chrome Web Store 審査: Manifest V3準拠、最小権限の原則
- Firefox Add-ons: ほぼ同一コードで動作（WebExtension API）
- Safari: Xcode経由でのビルドが必要（Xcodeプロジェクト別途）
- 全連携でPIIフィルター必須（デフォルトON）
- OAuth Client ID/Secret は `.env` 管理（ハードコード厳禁）
