# Lessons Learned

## 2026-04-15: stdio JSON-RPCは Tauriサイドカーとして不安定
**Pattern:** Node.jsプロセスをTauriからstdio経由で通信する方式はCWD問題とstdin/stdoutロックアップで失敗する。
**Action:** HTTP localhost方式に移行した。ブリッジは独立HTTPサーバーとして起動する。

## 2026-04-15: UIのmockフォールバックは開発時に必須
**Pattern:** バックエンド接続失敗時にUIが真っ白になる。
**Action:** 3段階フォールバック（HTTP → Tauri invoke → mock）を実装。

## 2026-04-15: 「作ったが配線されていない」モジュールが溜まる
**Pattern:** 機能実装後にブリッジコマンド登録やUI接続を忘れてデッドコードになる。
**Action:** 新機能追加時は必ず①TypeScript実装 ②ブリッジコマンド ③Tauriコマンド登録 ④UI呼び出しの4点を同時にチェックする。
