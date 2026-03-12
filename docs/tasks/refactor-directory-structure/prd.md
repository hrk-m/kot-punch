# PRD: refactor-directory-structure

## 1. Executive Summary

### Problem Statement

旧 `src/lib/` ディレクトリに設定・ブラウザ操作・UI ユーティリティ・ロガー・通知・長押し判定が混在しており、ドメインの境界が不明確だった。加えて以下の問題が存在した：

- `ClockIn` / `ClockOut` がほぼ同一実装で重複していた（差分は selector・ログスコープ・通知メッセージの 3 箇所のみ）
- `OpenKot` / `OpenRequest` の初期化パターン（`_isProcessing`、設定取得、バリデーション、try-finally）が重複している
- `puppeteer.ts` が認証・打刻・KOT オープン・申請ログインの 4 責務を持っていた（SRP 違反）
- ブラウザのライフサイクル（`disconnect` / `close`）管理が各関数で異なり不統一だった

### Proposed Solution

ドメインロジックを `services/`、プラットフォーム固有コードを `platform/`、汎用ユーティリティを `shared/` に分離し、`lib/` を廃止する。
あわせて `ClockIn` / `ClockOut` の重複を `BasePunchAction` で解消し、`puppeteer.ts` を責務ごとに分割する。

### Success Criteria

- `src/lib/` ディレクトリが廃止されている ✅
- `ClockIn` / `ClockOut` が `BasePunchAction` を継承し、差分のみを持つ ✅
- `puppeteer.ts` の 4 責務が `auth.ts` / `punch.ts` / `open-kot.ts` / `open-request.ts` に分割されている ✅
- 各ファイルの責務が単一である（SRP 準拠）✅
- 既存テストが全てパスする（振る舞いの変更なし）✅
- `actions/` 層がビジネスロジックを持たない ✅
- ブラウザ所有権のルールが統一されている（`open*` は `disconnect()` でユーザーに引き渡し、`punchKot()` は完了時に `close()` する。`dry-run` のみ例外的に `disconnect()` を維持する）✅

---

## 2. ディレクトリ構成（実装後）

```
src/
  plugin.ts                            # エントリポイント（4 アクション登録 + connect）
  actions/                             # Stream Deck グルー層（薄く保つ）
    punch/
      base-punch-action.ts             # ClockIn / ClockOut 共通ロジック
    clock-in.ts                        # selector / ログスコープ / 成功メッセージのみ定義
    clock-out.ts                       # selector / ログスコープ / 成功メッセージのみ定義
    open-kot.ts                        # 設定取得・バリデーション・ページ操作を直接実装
    open-request.ts                    # 設定取得・バリデーション・ページ操作を直接実装
    __tests__/
      clock-in.test.ts
      clock-out.test.ts
      open-kot.test.ts
      open-request.test.ts
  services/
    kot/                               # KOT ドメインサービス層
      auth.ts                          # Puppeteer 起動 + JWT トークン認証
      punch.ts                         # 打刻操作（ボタンクリック〜submit）
      open-kot.ts                      # 認証済みページを開いて disconnect
      open-request.ts                  # 申請画面へログインして disconnect
      __tests__/
        auth.test.ts
        punch.test.ts
        open-kot.test.ts
        open-request.test.ts
  platform/
    desktop/
      notify.ts                        # node-notifier によるデスクトップ通知
      __tests__/
        notify.test.ts
    streamdeck/
      logger.ts                        # scoped logger（固定スコープ一覧を logger オブジェクトとして公開）
      show-error-image.ts              # エラー画像を一時表示（3 秒後にリセット）
      settings/
        punch-settings.ts              # KotPunchSettings 型・hasRequired* 関数・getGlobalSettings
        request-settings.ts            # RequestSettings 型・hasRequired* 関数・getRequestSettings
        __tests__/
          punch-settings.test.ts
          request-settings.test.ts
      __tests__/
        show-error-image.test.ts
  shared/
    long-press.ts                      # 長押し判定（2 秒閾値・PressTracker）
    __tests__/
      long-press.test.ts
  __tests__/                           # ビルドアセット・アーキテクチャテスト
    architecture.test.ts
    manifest-template.test.ts
    manifest.test.ts
    runtime-dependencies.test.ts
scripts/
  generate-manifest.mts
  install-browser.mts
```

---

## 3. 各層の責務

### `actions/punch/base-punch-action.ts`

**目的**: `ClockIn` / `ClockOut` の重複を排除する。

- `BasePunchAction extends SingletonAction` を定義する
- 以下を abstract プロパティとしてサブクラスに委譲する
  - `logger: LoggerScope`
  - `selector: PunchSelector`（`"#attend"` | `"#leave"`）
  - `successMessage: string`
- `_isProcessing` フラグ・`pressTracker`・`onKeyDown`・`onKeyUp` の全共通ロジックをここに実装する

```typescript
// サブクラスはこれだけで動く
@action({ UUID: "com.hrk-m.kot-punch.clock-in" })
export class ClockIn extends BasePunchAction {
    protected readonly logger = logger.clockIn;
    protected readonly selector = "#attend" as const;
    protected readonly successMessage = "出勤打刻が完了しました";
}
```

### `actions/clock-in.ts` / `actions/clock-out.ts`

- `BasePunchAction` を継承し、差分 3 箇所（`logger` / `selector` / `successMessage`）のみ定義する

### `actions/open-kot.ts` / `actions/open-request.ts`

- `SingletonAction` を直接継承する
- `_isProcessing` フラグ・設定取得・バリデーション・ページ操作・エラー処理を個別に実装する
- ※ 共通基底クラスは設けていない（`OpenKot` は `KotPunchSettings`、`OpenRequest` は `RequestSettings` と設定型が異なるため）

### `services/kot/auth.ts`

- `openAuthenticatedKotPage(settings)` — Puppeteer 起動・URL ナビゲーション・JWT トークンセット・dialog 監視による認証失敗検出

### `services/kot/punch.ts`

- `punchKot(selector, settings)` — 認証済みページで打刻ボタンを押し、ユーザー選択・パスワード入力・submit を完了してブラウザを `close()` する
- dry-run 時は submit せずに `disconnect()` する

### `services/kot/open-kot.ts`

- `openKotPage(settings)` — 認証済みページを開き、ブラウザを `disconnect()` してユーザーに引き渡す

### `services/kot/open-request.ts`

- `openRequestPage(settings)` — 申請 URL へナビゲーション・ID/パスワード入力・ログインボタンクリック後に `disconnect()` する
- ブラウザ起動オプションを `services/kot/auth.ts` と同じ設定で直接 launch する

### `platform/streamdeck/logger.ts`

- `LoggerScope` 型をエクスポートする
- `logger` オブジェクト（固定スコープ一覧）をエクスポートする
  - `logger.clockIn` / `logger.clockOut` / `logger.openKot` / `logger.openRequest` / `logger.puppeteer` / `logger.notify`
- Stream Deck 環境外（テスト時）は noop 実装にフォールバックする

### `platform/streamdeck/show-error-image.ts`

- `showErrorImage(action)` — エラー画像を表示し、3 秒後に元の画像へ戻す
- `ImageSettable` インターフェースで依存を最小化する
- `resolveErrorImagePath()` をエクスポートしてテストから呼び出せるようにする
- エラー画像はモジュール読み込み時に IIFE で同期読み込みする

### `platform/streamdeck/settings/punch-settings.ts`

- `KotPunchSettings` 型定義
- `getGlobalSettings()` — Stream Deck グローバル設定を取得する
- `hasRequiredSettings(s)` — KOT 画面を開く最低限の必須設定を確認する（`kotPunchUrl` / `kotPunchKey` / `kotPunchToken`）
- `hasRequiredPunchSettings(s)` — 打刻に必要な追加設定を確認する（上記 3 項目 + `kotPunchUsername` / `kotPunchPassword`）

### `platform/streamdeck/settings/request-settings.ts`

- `RequestSettings` 型定義
- `getRequestSettings()` — Stream Deck グローバル設定を取得する
- `hasRequiredRequestSettings(s)` — 申請画面を開く必須設定を確認する（`requestUrl` / `requestUsername` / `requestPassword`）

### `platform/desktop/notify.ts`

- `notify(message)` — node-notifier でデスクトップ通知を送る
- 送信元を `com.elgato.StreamDeck` に固定して Stream Deck の通知として表示する

### `shared/long-press.ts`

- `createPressTracker()` — action instance ごとに 2 秒タイマー・成立済みフラグ・解除処理を管理する
- `LONG_PRESS_THRESHOLD_MS` — 長押し閾値定数（2000ms）
- `PressTracker` 型
- `BasePunchAction` からのみ使用される

---

## 4. 依存関係

```
plugin.ts
  → actions/

actions/clock-in.ts / actions/clock-out.ts
  → actions/punch/base-punch-action
  → platform/streamdeck/logger

actions/punch/base-punch-action.ts
  → platform/streamdeck/settings/punch-settings（getGlobalSettings / hasRequiredPunchSettings）
  → services/kot/punch（punchKot）
  → platform/streamdeck/show-error-image
  → platform/desktop/notify
  → shared/long-press

actions/open-kot.ts
  → platform/streamdeck/settings/punch-settings（getGlobalSettings / hasRequiredSettings）
  → services/kot/open-kot（openKotPage）
  → platform/streamdeck/show-error-image
  → platform/desktop/notify
  → platform/streamdeck/logger

actions/open-request.ts
  → platform/streamdeck/settings/request-settings（getRequestSettings / hasRequiredRequestSettings）
  → services/kot/open-request（openRequestPage）
  → platform/streamdeck/show-error-image
  → platform/desktop/notify
  → platform/streamdeck/logger

services/kot/auth.ts
  → platform/streamdeck/settings/punch-settings（型）
  → platform/streamdeck/logger

services/kot/punch.ts
  → services/kot/auth
  → platform/streamdeck/settings/punch-settings（型）
  → platform/streamdeck/logger

services/kot/open-kot.ts
  → services/kot/auth
  → platform/streamdeck/settings/punch-settings（型）
  → platform/streamdeck/logger

services/kot/open-request.ts
  → platform/streamdeck/settings/request-settings（型）
  → platform/streamdeck/logger

platform/desktop/notify.ts
  → platform/streamdeck/logger

platform/streamdeck/show-error-image.ts
  → （依存なし）

platform/streamdeck/logger.ts
  → （依存なし）

shared/long-press.ts
  → （依存なし）
```

循環依存: **なし**

---

## 5. ブラウザライフサイクル

| 関数 | 成功時 | 失敗時 |
|---|---|---|
| `punchKot()` | `browser.close()` | `browser.close()` |
| `punchKot()` dry-run | `browser.disconnect()` | `browser.close()` |
| `openKotPage()` | `browser.disconnect()` | `browser.close()` |
| `openRequestPage()` | `browser.disconnect()` | `browser.close()` |

ブラウザ起動オプションは `auth.ts` と `open-request.ts` の 2 か所に分散している。

```typescript
// auth.ts / open-request.ts 共通の起動オプション（重複）
{ headless: false, defaultViewport: null, args: ["--start-maximized"] }
```

---

## 6. テスト構成

| テストファイル | 対象 |
|---|---|
| `actions/__tests__/clock-in.test.ts` | `ClockIn` アクション（BasePunchAction 経由の onKeyUp / onKeyDown）|
| `actions/__tests__/clock-out.test.ts` | `ClockOut` アクション（BasePunchAction 経由の onKeyUp / onKeyDown）|
| `actions/__tests__/open-kot.test.ts` | `OpenKot` アクション（onKeyUp）|
| `actions/__tests__/open-request.test.ts` | `OpenRequest` アクション（onKeyUp）|
| `services/kot/__tests__/auth.test.ts` | `openAuthenticatedKotPage()`（認証成功・失敗）|
| `services/kot/__tests__/punch.test.ts` | `punchKot()`（打刻・dry-run）|
| `services/kot/__tests__/open-kot.test.ts` | `openKotPage()`|
| `services/kot/__tests__/open-request.test.ts` | `openRequestPage()`|
| `platform/streamdeck/settings/__tests__/punch-settings.test.ts` | `KotPunchSettings` バリデーション・設定取得 |
| `platform/streamdeck/settings/__tests__/request-settings.test.ts` | `RequestSettings` バリデーション・設定取得 |
| `platform/streamdeck/__tests__/show-error-image.test.ts` | `showErrorImage()` |
| `platform/desktop/__tests__/notify.test.ts` | `notify()` |
| `shared/__tests__/long-press.test.ts` | `createPressTracker()` |
| `src/__tests__/architecture.test.ts` | 新ディレクトリ構造のファイル存在確認・旧 `lib/` ファイルの不在確認・TypeScript 相対 import に `.js` 拡張子が使われていないことの確認 |
| `src/__tests__/manifest.test.ts` | `generateManifest()` 関数の動作確認（temp ディレクトリを使用し、labels.json なしでも manifest.json が生成されることを確認） |
| `src/__tests__/manifest-template.test.ts` | manifest.template.json の内容検証（`open-request` の `UserTitleEnabled: false`、`clock-in` / `clock-out` の `DisableAutomaticStates: true`） |
| `src/__tests__/runtime-dependencies.test.ts` | root と plugin package.json の puppeteer バージョン完全一致確認・`generate-manifest` / `install-browser` / `postinstall` スクリプトの存在確認 |

---

## 7. Non-Goals（変更しない範囲）

- 機能追加・振る舞いの変更は行わない（純粋なリファクタリング）
- `actions/` の State 管理ロジックは変更しない
- `manifest.json` / `ui/` / `imgs/` は変更しない
- エラークラス（`errors.ts`）の導入は行わない
- Prettier / ESLint など新しい整形・lint ツールの導入は行わない

---

## 8. 未対応の改善項目（今後の課題）

以下は当初 PRD に記載していたが今回のリファクタリングでは見送った項目。

| 項目 | 内容 |
|---|---|
| `BasePageOpenAction<T>` | `OpenKot` / `OpenRequest` の `_isProcessing` パターンが依然重複している。型引数を持つジェネリクス基底クラスで統一できる |
| `shared/validation.ts` 分離 | `hasRequired*` 関数が各 settings ファイルに混在している。バリデーション専用ファイルへ切り出すと責務が明確になる |
| `shared/puppeteer.ts` 統一 | `auth.ts` と `open-request.ts` で起動オプションが重複している。`createBrowser()` で一元管理できる |
| `logger.ts` の `createScope` エクスポート化 | 現状は固定スコープ一覧の `logger` オブジェクトを公開している。`createScope(name)` を直接エクスポートすれば新アクション追加時に `logger.ts` を編集せずに済む |
| `showErrorImage.ts` の遅延読み込み化 | 現状はモジュール読み込み時に `readFileSync()` を同期実行している。初回呼び出し時の遅延読み込み＋キャッシュにするとテストで差し替えやすくなる |
