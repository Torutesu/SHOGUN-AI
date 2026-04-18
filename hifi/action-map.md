# SHOGUN Hi-Fi Action Map

UIボタンと ActionRegistry / Runtime の対応表。
未接続導線の回帰チェックに使う。

## Runtime Entry Points

- `window.SHOGUN_RUNTIME.executeAction(actionKey, payload, options)`
- `window.SHOGUN_RUNTIME.requestWriteAction(actionKey, payload, title, description)`
- `window.SHOGUN_RUNTIME.pushToast(message, kind)`

## app.jsx

- Topbar `Open in Hummingbird` -> `app.open_hummingbird` (WRITE confirm)
- Share modal `Create share link` -> `app.create_share_link`
- Chat sub-nav `New conversation` -> local chat state update

## settings-modal.jsx

- General `Email edit` -> `settings.save(section=general)`
- Privacy app toggle -> `settings.save(section=privacy)`
- Data deletion buttons -> `data.delete_range` / `data.delete_all` / `account.delete` (WRITE confirm)
- Chat `Save` buttons -> `settings.save(section=chat.instructions|chat.notes)`
- Integrations `Connect` -> `integrations.connect`
- Integrations row actions -> `integrations.toggle`
- Subscription actions -> `settings.save(section=subscription, ...)`
- Support `Report` -> `diagnostics.report`

## screens-a.jsx

- Home CTA buttons -> `draft.create` / `schedule.create` / `settings.save`
- Memory filter button -> `memory.search`
- Memory `Save test` -> `memory.ingest` then `memory.search` refresh
- River actions (`Open in Chat`, `Open source`) -> `memory.search`
- River `Remove from index` (indexed row only) -> `memory.delete` (WRITE confirm); app dispatches `shogun-memory-index-changed` on success for list refresh
- River more menu -> `settings.save(section=memory)`

## screens-b.jsx

- Composer buttons (`Memory/Agent/Tool/Attach/Mic/Send`) -> `memory.search` / `schedule.create` / `integrations.connect` / `draft.create`
- Chat header more -> `settings.save(section=chat)`
- Artifact actions (`Open in Work`, `Accept/Reject/Iterate`) -> `draft.create`
- Context actions -> `draft.create` / `schedule.create` / `app.create_share_link`
- Agents header/actions -> `settings.save(section=agents)` / `schedule.create`

## screens-c.jsx

- Work header -> `memory.search` / `draft.create`
- Work task row more -> `settings.save(section=work)`
- Capture pause/resume -> `capture.pause` / `capture.resume`
- Capture permissions -> `permissions.manage`
- Integrations add/toggle -> `integrations.connect` / `integrations.toggle`
- Settings key add -> `settings.save(section=keys)`

## screens-meetings.jsx

- Filter -> `memory.search`
- Prompt actions -> `draft.create` / `schedule.create`
- Recipe chips -> `brief.get`
- `All recipes` -> `brief.get(span=week)`

## Core Registry Keys

- `app.open_hummingbird`
- `app.create_share_link`
- `settings.save`
- `settings.load`
- `integrations.connect`
- `integrations.toggle`
- `capture.pause`
- `capture.resume`
- `permissions.manage`
- `diagnostics.report`
- `data.delete_range`
- `data.delete_all`
- `account.delete`
- `memory.search`
- `memory.ingest`
- `memory.delete`
- `brief.get`
- `stats.get`
- `draft.create`
- `schedule.create`

## Quick Verification

```bash
./hifi/scripts/check-actions.sh
```

Or:

```bash
python3 hifi/scripts/check-actions.py
```

## E2E (Playwright)

リポジトリルートで依存関係を入れたうえで:

```bash
npm install
npx playwright install chromium
npm run test:e2e
```

`playwright.config.js` が `python3 -m http.server` で静的配信し、`SHOGUN Hi-Fi UI.html` を開いてマウントと `executeAction` を検証します。

`tests/e2e/hifi-smoke.spec.js` の追加ケース: ユーザーメニューから Settings を開いて閉じる、トップバー先頭の Hummingbird で WRITE 確認を開き Cancel または Confirm（成功トースト）。
Also: Settings > Data Controls > first Delete (WRITE confirm, Cancel); Share modal (backdrop close + Create share link toast).
