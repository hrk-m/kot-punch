# PRD: system-notification

## 1. Executive Summary

### Problem Statement

Clock In / Clock Out / Open KOT / Open Request は処理中に Puppeteer でブラウザを操作するため、バックグラウンドで処理が終わっても Stream Deck ボタンを見ないと完了を気づけない。

### Proposed Solution

処理成功時に macOS 通知センターへポップアップ通知を送る。`node-notifier` を共通ユーティリティとして `lib/` に追加し、各アクションの成功パスから呼び出す。

### Success Criteria

- 全 4 アクション（Clock In / Clock Out / Open KOT / Open Request）の成功時に macOS 通知が表示される
- エラー時は通知を出さない（既存の `showErrorImage()` に任せる）
- 通知の title は `"KOT Punch"` 固定
- 通知送信の失敗でメイン処理が中断しない（fire-and-forget）

---

## 2. User Experience & Functionality

### User Personas

Stream Deck のボタンを押してから KOT の打刻・画面表示完了まで別の作業をしているユーザー。

### User Stories

| # | Story | Acceptance Criteria |
|---|-------|---------------------|
| 1 | Clock In 成功時に通知を受け取りたい | `出勤打刻が完了しました` という通知が macOS 通知センターに表示される |
| 2 | Clock Out 成功時に通知を受け取りたい | `退勤打刻が完了しました` という通知が macOS 通知センターに表示される |
| 3 | Open KOT 成功時に通知を受け取りたい | `KING OF TIME を開きました` という通知が macOS 通知センターに表示される |
| 4 | Open Request 成功時に通知を受け取りたい | `申請画面を開きました` という通知が macOS 通知センターに表示される |
| 5 | エラー時に通知を受け取らない | 失敗時は通知が出ず、既存の `showErrorImage()` のみが動作する |

### 通知内容

| アクション | title | message |
|---|---|---|
| Clock In | `KOT Punch` | `出勤打刻が完了しました` |
| Clock Out | `KOT Punch` | `退勤打刻が完了しました` |
| Open KOT | `KOT Punch` | `KING OF TIME を開きました` |
| Open Request | `KOT Punch` | `申請画面を開きました` |

### Non-Goals

- エラー時の通知（既存の `showErrorImage()` で代替）
- Windows / Linux 対応（macOS 専用）
- 通知クリック時のアクション
- 通知音のカスタマイズ

---

## 3. Technical Specifications

### Architecture Overview

```
src/
  lib/
    notify.ts         # 新規: notify(message) ユーティリティ
    notify.test.ts    # 新規: ユニットテスト

  actions/
    clock-in.ts       # 成功後に notify("出勤打刻が完了しました") を追加
    clock-out.ts      # 成功後に notify("退勤打刻が完了しました") を追加
    open-kot.ts       # 成功後に notify("KING OF TIME を開きました") を追加
    open-request.ts   # 成功後に notify("申請画面を開きました") を追加
```

### `lib/notify.ts` 設計

```typescript
import notifier from "node-notifier";

const TITLE = "KOT Punch";

export function notify(message: string): void {
    notifier.notify({ title: TITLE, message });
}
```

- `notify()` は同期的に呼び出しても通知送信は非同期（node-notifier の内部動作）
- アクション側では `void notify(...)` で fire-and-forget とする
- 通知送信エラーは無視（ユーザー体験に影響しない）

### 各アクションへの変更箇所

#### Clock In（成功パス）

```typescript
await punchKot("#attend", settings);
await ev.action.showOk();
await ev.action.setState(1);
void notify("出勤打刻が完了しました");  // ← 追加
```

#### Clock Out（成功パス）

```typescript
await punchKot("#leave", settings);
await ev.action.showOk();
await ev.action.setState(1);
void notify("退勤打刻が完了しました");  // ← 追加
```

#### Open KOT（成功パス）

```typescript
await openKotPage(settings);
void notify("KING OF TIME を開きました");  // ← 追加
```

#### Open Request（成功パス）

```typescript
await openRequestPage(settings);
void notify("申請画面を開きました");  // ← 追加
```

### Integration Points

| 依存 | 用途 |
|------|------|
| `node-notifier` (npm) | macOS 通知センターへの通知送信 |
| `@types/node-notifier` (npm, devDependencies) | TypeScript 型定義 |

### Installation

```bash
bun add node-notifier
bun add -d @types/node-notifier
```

---

## 4. Testing Strategy

- `lib/notify.ts` のテストでは `node-notifier` を `vi.mock` でモックし、`notifier.notify` が正しい引数で呼ばれることを検証する
- 各アクションテストでは `../../lib/notify.js` をモックし、成功パスで `notify` が呼ばれること・エラーパスで呼ばれないことを検証する

---

## 5. Risks

| リスク | 対策 |
|---|---|
| macOS 通知の権限が未許可 | 初回通知時に macOS が許可ダイアログを表示するため、ユーザーが許可すれば解消 |
| `node-notifier` バンドルサイズ増加 | Rollup のバンドルに含まれるが、puppeteer が既に重いため影響軽微 |
| 通知送信が失敗しても気づかない | fire-and-forget のため意図的に無視。通知は補助機能であり必須ではない |
