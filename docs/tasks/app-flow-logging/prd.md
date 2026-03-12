# PRD: app-flow-logging

## 概要

アプリ全体の処理フローを `streamDeck.logger` で可視化する。
現状、ログは `notify.ts` のデスクトップ通知結果のみに限られており、打刻操作やブラウザ操作の各ステップが追跡できない。

---

## 背景・課題

| 現状 | 問題点 |
|------|--------|
| `notify.ts` のみがロガーを持つ | 打刻の開始・成功・失敗が追えない |
| Action 層にログなし | どのタイミングで処理が止まったか不明 |
| `puppeteer.ts` にログなし | ブラウザ操作のどのステップで失敗したか不明 |
| 各ファイルが独自に `createScope` | スコープ名の一貫性がなくなるリスク |

---

## 要件

### 1. `lib/logger.ts` を新設（全スコープ集約）

```ts
// lib/logger.ts
import streamDeck from "@elgato/streamdeck";

const root = streamDeck.logger;

export const logger = {
  clockIn:     root.createScope("clock-in"),
  clockOut:    root.createScope("clock-out"),
  openKot:     root.createScope("open-kot"),
  openRequest: root.createScope("open-request"),
  puppeteer:   root.createScope("puppeteer"),
  notify:      root.createScope("notify"),
};
```

- `streamDeck.logger.createScope` の呼び出しをこのファイルに集約する
- 各モジュールは `import { logger } from "../lib/logger"` で使う

---

### 2. Action 層にフローログを追加

対象: `clock-in.ts` / `clock-out.ts` / `open-kot.ts` / `open-request.ts`

各アクションのスコープ（例: `logger.clockIn`）で以下を記録する。

| タイミング | レベル | メッセージ例 |
|-----------|--------|-------------|
| `onKeyUp` 受信 | `info` | `"onKeyUp triggered"` |
| 処理中ガード hit | `debug` | `"already processing, skipped"` |
| State 1 → リセット | `debug` | `"state reset to 0"` |
| 設定取得 | `debug` | `"fetching settings"` |
| 必須設定不足 | `warn` | `"required settings missing"` |
| 打刻/操作 開始 | `info` | `"starting punch"` / `"opening page"` |
| 打刻/操作 成功 | `info` | `"punch succeeded"` / `"page opened"` |
| 打刻/操作 失敗 | `error` | `"punch failed: {error.message}"` |

---

### 3. `puppeteer.ts` にフローログを追加

スコープ: `logger.puppeteer`

#### `setupAuthenticatedPage`

| タイミング | レベル | メッセージ |
|-----------|--------|-----------|
| ブラウザ起動 | `debug` | `"launching browser"` |
| 1st goto | `debug` | `"navigating to {url}"` |
| JWT トークンセット | `debug` | `"setting JWT token: {key}"` |
| 2nd goto（認証適用） | `debug` | `"re-navigating for auth"` |
| 認証成功 | `debug` | `"auth succeeded"` |
| 認証失敗（dialog検出） | `error` | `"auth failed: dialog detected"` |

#### `punchKot`

| タイミング | レベル | メッセージ |
|-----------|--------|-----------|
| 打刻ボタンクリック | `info` | `"clicking punch button: {selector}"` |
| ユーザー選択 | `debug` | `"selecting user"` |
| パスワード入力 | `debug` | `"typing password"` |
| DryRun モード | `info` | `"dry-run mode, skipping submit"` |
| submit 実行 | `info` | `"submitting punch"` |
| 完了 | `info` | `"punch completed"` |

#### `openRequestPage`

| タイミング | レベル | メッセージ |
|-----------|--------|-----------|
| ページ遷移・ログイン | `debug` | `"opening request page"` |
| 完了 | `info` | `"request page opened"` |

#### `openKotPage`

| タイミング | レベル | メッセージ |
|-----------|--------|-----------|
| 完了 | `info` | `"kot page opened"` |

---

### 4. `notify.ts` のロガーを `logger.notify` に置き換え

- `const logger = streamDeck.logger.createScope("notify");` を削除
- `import { logger } from "./logger"` に切り替え
- `logger.notify.debug / .warn / .error` でそのまま使う

---

## 変更ファイル一覧

| ファイル | 変更種別 |
|---------|---------|
| `src/lib/logger.ts` | **新規作成** |
| `src/lib/notify.ts` | logger import を置き換え |
| `src/actions/clock-in.ts` | フローログを追加 |
| `src/actions/clock-out.ts` | フローログを追加 |
| `src/actions/open-kot.ts` | フローログを追加 |
| `src/actions/open-request.ts` | フローログを追加 |
| `src/lib/puppeteer.ts` | フローログを追加 |

---

## 非機能要件

- ログ出力のみの変更であり、既存の動作ロジックは一切変更しない
- パスワード等の機密情報はログに含めない
- テストは logger のモック差し替えで対応する

---

## 完了条件

- [ ] `lib/logger.ts` が存在し、全スコープが定義されている
- [ ] 各 Action の処理ステップでログが出力される
- [ ] `puppeteer.ts` の各操作ステップでログが出力される
- [ ] `notify.ts` が `logger.notify` を使うよう置き換え済み
- [ ] `bun run lint && bun run test && bunx tsc --noEmit && bun run build` がすべてパス
