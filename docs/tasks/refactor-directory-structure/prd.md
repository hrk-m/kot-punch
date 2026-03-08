# PRD: refactor-directory-structure

## 1. Executive Summary

### Problem Statement

現在の `src/lib/` ディレクトリに設定・ブラウザ操作・UI ユーティリティが混在しており、ドメインの境界が不明確。将来の通知処理追加を見据えると、責務の分離が不可欠。

### Proposed Solution

ドメインロジックを `features/`、共通インフラを `shared/` に分離し、`lib/` を廃止する。エラーを型ベースクラスで定義し、通知処理を一元化する。

### Success Criteria

- `src/lib/` ディレクトリが廃止されている
- 各ファイルの責務が単一である（SRP 準拠）
- 循環依存がゼロである
- 既存テストが全てパスする（振る舞いの変更なし）
- `actions/` 層がビジネスロジックを持たない（設定バリデーションを `features/` に委譲）

---

## 2. ディレクトリ構成

```
src/
  plugin.ts
  actions/                      # Stream Deck グルー層（薄く保つ）
    clock-in.ts
    clock-out.ts
    open-kot.ts
    open-request.ts
    __tests__/
      clock-in.test.ts
      clock-out.test.ts
      open-kot.test.ts
      open-request.test.ts
  features/                     # ドメインロジック
    punch/
      kot.ts                    # punchKot / openKotPage
      __tests__/
        kot.test.ts
    request/
      request.ts                # openRequestPage
      __tests__/
        request.test.ts
  shared/                       # ドメイン横断インフラ
    puppeteer.ts                # createBrowser()（launchオプション一元化）
    settings.ts                 # 設定型定義 + getGlobalSettings / getRequestSettings
    validation.ts               # hasRequired* 関数群
    errors.ts                   # 型ベースエラークラス
    notification.ts             # notify(action, e)（showErrorImage を統合）
    __tests__/
      validation.test.ts
      notification.test.ts
  labels/
    labels.json
```

---

## 3. 各層の責務

### `actions/`

- Stream Deck イベント（`onKeyUp`）を受信する
- `shared/settings` で設定を取得する
- `features/*` の関数を呼ぶ
- `catch(e)` で `shared/notification` の `notify(action, e)` に委譲する
- ビジネスロジック・バリデーション・通知手段を**持たない**

### `features/punch/kot.ts`

- `punchKot(selector, settings)` — 打刻操作
- `openKotPage(settings)` — KOT ページを開く
- `shared/validation` でバリデーションし、失敗時は `MissingSettingsError` を throw する
- `shared/puppeteer` の `createBrowser()` を使う

### `features/request/request.ts`

- `openRequestPage(settings)` — 申請画面にログインしてブラウザをユーザーに引き渡す
- 同上のバリデーション・エラー throw パターンに従う

### `shared/puppeteer.ts`

- `createBrowser()` — puppeteer の launch オプションを一元管理
  ```typescript
  { headless: false, defaultViewport: null, args: ["--start-maximized"] }
  ```

### `shared/settings.ts`

- 型定義: `KotPunchSettings` / `RequestSettings`
- データ取得: `getGlobalSettings()` / `getRequestSettings()`
- バリデーションロジックは**持たない**（`validation.ts` に委譲）

### `shared/validation.ts`

- `hasRequiredSettings(s)` — open-kot 用
- `hasRequiredPunchSettings(s)` — clock-in / clock-out 用
- `hasRequiredRequestSettings(s)` — open-request 用

### `shared/errors.ts`

- 型ベースエラークラス（`instanceof` で判別）
  ```typescript
  export class MissingSettingsError extends Error {}
  export class AuthenticationError extends Error {}
  export class BrowserLaunchError extends Error {}
  ```

### `shared/notification.ts`

- `notify(action, e)` — エラー種別に応じて通知手段を切り替える
- `showErrorImage` ロジックを統合する
- 将来の macOS 通知などはここに追加する

---

## 4. 依存関係

```
actions/
  → shared/settings（getGlobalSettings）
  → features/*（ビジネスロジック呼び出し）
  → shared/notification（notify）

features/punch/kot.ts
  → shared/settings（型）
  → shared/validation（hasRequired*）
  → shared/errors（throw）
  → shared/puppeteer（createBrowser）

features/request/request.ts
  → shared/settings（型）
  → shared/validation（hasRequired*）
  → shared/errors（throw）
  → shared/puppeteer（createBrowser）

shared/notification.ts
  → shared/errors（instanceof 判定）
```

循環依存: **なし**

---

## 5. テスト移行方針

| 旧ファイル | 新ファイル |
|---|---|
| `lib/__tests__/puppeteer.test.ts`（打刻・KOT 部分）| `features/punch/__tests__/kot.test.ts` |
| `lib/__tests__/puppeteer.test.ts`（申請部分）| `features/request/__tests__/request.test.ts` |
| `lib/__tests__/settings.test.ts` | `shared/__tests__/validation.test.ts` |
| `lib/__tests__/settings-request.test.ts` | `shared/__tests__/validation.test.ts`（統合）|
| `lib/__tests__/showErrorImage.test.ts` | `shared/__tests__/notification.test.ts` |
| `actions/__tests__/*.test.ts` | mock パスのみ更新（振る舞い変更なし）|

### `actions/__tests__/` の mock パス更新

```typescript
// 変更前
vi.mock("../../lib/puppeteer.js", ...)
vi.mock("../../lib/settings.js", ...)
vi.mock("../../lib/showErrorImage.js", ...)

// 変更後
vi.mock("../../features/punch/kot.js", ...)   // clock-in / clock-out / open-kot
vi.mock("../../features/request/request.js", ...) // open-request
vi.mock("../../shared/settings.js", ...)
vi.mock("../../shared/notification.js", ...)
```

---

## 6. Non-Goals

- 機能追加・振る舞いの変更は行わない（純粋なリファクタリング）
- `actions/` の State 管理ロジックは変更しない
- `manifest.json` / `ui/` / `imgs/` は変更しない

---

## 7. Risks

| リスク | 対策 |
|---|---|
| import パス変更によるビルドエラー | 実装後に `bunx tsc --noEmit` で全チェック |
| mock パス変更によるテスト漏れ | 実装後に `bun run test` で全テストパスを確認 |
| `showErrorImage` 統合による振る舞い変化 | `notification.test.ts` で既存テストケースを全て移植 |
