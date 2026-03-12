# Tasks: refactor-directory-structure

> 合意済み事項
>
> - `src/lib/` ディレクトリを廃止し `services/` / `platform/` / `shared/` に再配置する
> - `ClockIn` / `ClockOut` の重複を `BasePunchAction` 基底クラスで解消する
> - `puppeteer.ts` の 4 責務を `auth.ts` / `punch.ts` / `open-kot.ts` / `open-request.ts` に分割する
> - `BasePageOpenAction<T>` 抽出・`shared/validation.ts` 分離・`shared/puppeteer.ts` 統一・`createScope` エクスポート化・`showErrorImage` 遅延読み込み化は今回スコープ外とする
> - 振る舞いの変更は一切行わない（純粋なリファクタリング）

---

## Phase 1: Impact and Change Analysis

### Phase 1.1: 関連実装を調査する

- [x] `src/lib/` 配下の全ファイルを読み、各ファイルの責務・依存関係・公開 API を整理する
- [x] `src/actions/` 配下の全アクションファイルと既存テストを読み、`lib/` への依存箇所を列挙する
- [x] `ClockIn` / `ClockOut` の実装を比較し、差分が `selector` / ログスコープ / `successMessage` の 3 箇所のみであることを確認する
- [x] `puppeteer.ts` の責務（認証・打刻・KOT オープン・申請ログイン）を整理し、分割単位を決める

### Phase 1.2: 変更候補と移動方針を特定する

- [x] 以下の変更対象ファイルと変更理由を確定する

| ファイル | 変更種別 | 変更理由 |
|---|---|---|
| `src/lib/puppeteer.ts` | 分割・削除 | 4 責務を `services/kot/` 配下の 4 ファイルへ分割する |
| `src/lib/settings.ts` | 移動・分割 | 打刻設定を `platform/streamdeck/settings/punch-settings.ts`、申請設定を `request-settings.ts` へ分離する |
| `src/lib/notify.ts` | 移動 | `platform/desktop/notify.ts` へ移動する |
| `src/lib/logger.ts` | 移動 | `platform/streamdeck/logger.ts` へ移動する |
| `src/lib/showErrorImage.ts` | 移動 | `platform/streamdeck/show-error-image.ts` へ移動する |
| `src/lib/long-press.ts` | 移動 | `src/shared/long-press.ts` へ移動する |
| `src/actions/clock-in.ts` | 変更 | `BasePunchAction` 継承に切り替え、差分 3 箇所のみ定義する |
| `src/actions/clock-out.ts` | 変更 | 同上 |
| `src/actions/punch/base-punch-action.ts` | 新規作成 | `ClockIn` / `ClockOut` の共通ロジックを集約する |
| `src/actions/open-kot.ts` | 変更 | import パスを新構造に更新する |
| `src/actions/open-request.ts` | 変更 | import パスを新構造に更新する |
| `src/plugin.ts` | 変更 | import パスを新構造に更新する |
| `src/__tests__/architecture.test.ts` | 新規作成 | 新ディレクトリ構造のファイル存在・旧 `lib/` 不在・`.js` 拡張子禁止を自動検証する |

- [x] テスト移行対応を確認する

| 旧テストファイル | 新テストファイル |
|---|---|
| `src/lib/__tests__/long-press.test.ts` | `src/shared/__tests__/long-press.test.ts` |
| `src/lib/__tests__/settings.test.ts` | `src/platform/streamdeck/settings/__tests__/punch-settings.test.ts` |
| `src/lib/__tests__/settings-request.test.ts`（新規）| `src/platform/streamdeck/settings/__tests__/request-settings.test.ts` |
| `src/lib/__tests__/notify.test.ts` | `src/platform/desktop/__tests__/notify.test.ts` |
| `src/lib/__tests__/showErrorImage.test.ts` | `src/platform/streamdeck/__tests__/show-error-image.test.ts` |
| `src/lib/__tests__/puppeteer.test.ts` | `src/services/kot/__tests__/auth.test.ts` / `punch.test.ts` / `open-kot.test.ts` / `open-request.test.ts` に分割 |
| `src/lib/__tests__/manifest.test.ts` | `src/__tests__/manifest.test.ts` |
| `src/lib/__tests__/manifest-template.test.ts` | `src/__tests__/manifest-template.test.ts` |
| `src/lib/__tests__/runtime-dependencies.test.ts` | `src/__tests__/runtime-dependencies.test.ts` |
| `src/actions/__tests__/*.test.ts` | mock パスを新構造に更新する |

- [x] **CHECKPOINT**: 変更対象ファイル・移動先・テスト移行方針が明確

---

## Phase 2: Mock Empty-State Baseline

### Phase 2.1: モック契約を固定する

- [x] **MOCK-CONTRACT** `services/kot/auth.ts` の公開 API を定義する

```typescript
export async function openAuthenticatedKotPage(
    settings: KotPunchSettings
): Promise<{ browser: Browser; page: Page }>
```

- [x] **MOCK-CONTRACT** `services/kot/punch.ts` の公開 API を定義する

```typescript
export type PunchSelector = "#attend" | "#leave";
export async function punchKot(selector: PunchSelector, settings: KotPunchSettings): Promise<void>
```

- [x] **MOCK-CONTRACT** `services/kot/open-kot.ts` / `services/kot/open-request.ts` の公開 API を定義する

```typescript
export async function openKotPage(settings: KotPunchSettings): Promise<void>
export async function openRequestPage(settings: RequestSettings): Promise<void>
```

- [x] **MOCK-CONTRACT** `platform/streamdeck/settings/punch-settings.ts` の公開 API を定義する

```typescript
export type KotPunchSettings = { kotPunchUrl?; kotPunchKey?; kotPunchToken?; kotPunchUsername?; kotPunchPassword?; kotPunchDryRun? }
export function hasRequiredSettings(s: KotPunchSettings): boolean    // open-kot 用（3 項目）
export function hasRequiredPunchSettings(s: KotPunchSettings): boolean  // 打刻用（5 項目）
export async function getGlobalSettings(): Promise<KotPunchSettings>
```

- [x] **MOCK-CONTRACT** `actions/punch/base-punch-action.ts` の abstract プロパティを定義する

```typescript
protected abstract readonly logger: LoggerScope;
protected abstract readonly selector: PunchSelector;
protected abstract readonly successMessage: string;
```

- [x] **CHECKPOINT**: 各層の公開 API と mock 形状が確定

### Phase 2.2: ディレクトリ構造を先行作成する

- [x] `src/services/kot/` ディレクトリを作成する（ファイルは空）
- [x] `src/platform/desktop/` ディレクトリを作成する
- [x] `src/platform/streamdeck/settings/` ディレクトリを作成する
- [x] `src/shared/` ディレクトリを作成する
- [x] `src/actions/punch/` ディレクトリを作成する
- [x] **CHECKPOINT**: フォルダ構造が PRD のディレクトリ構成と一致する

---

## Phase 3: Progressive Fill-In from Critical Paths

### Phase 3.1: 穴埋め対象を優先度付けする

- [x] 以下の優先順位を確認する

| 優先度 | 対象 | 理由 |
|---|---|---|
| 高 | `lib/puppeteer.ts` を 4 ファイルに分割する | 最多の依存元を持つため先に確定させる |
| 高 | `lib/settings.ts` を punch-settings / request-settings に分離する | 型定義が actions と services の両方に影響するため |
| 高 | `BasePunchAction` を作成し `ClockIn` / `ClockOut` を移行する | actions 層の最大重複を解消する |
| 中 | `notify` / `logger` / `showErrorImage` / `long-press` を移動する | 単純な移動のみで依存関係が少ない |
| 中 | テストファイルを新パスに移動し mock パスを更新する | 実装の後追いで対応できる |
| 低 | `architecture.test.ts` を追加する | 最後に追加して構造を自動検証する |

### Phase 3.2: `services/kot/` の分割実装

- [x] `src/services/kot/auth.ts` を新規作成する
  - Puppeteer 起動・URL ナビゲーション・Cookie 差し込み・dialog 監視による認証失敗検出を実装する
  - 起動オプションは `{ headless: false, defaultViewport: null, args: ["--start-maximized"] }` で統一する
  - dialog イベントが発生したら `"Authentication failed: dialog appeared while opening KING OF TIME."` を throw してブラウザを閉じる
- [x] `src/services/kot/punch.ts` を新規作成する
  - `auth.ts` の `openAuthenticatedKotPage` を利用する
  - 打刻ボタンクリック → ユーザー選択 → パスワード入力 → submit の順で実装する
  - 成功時は `browser.close()`、dry-run 時は `browser.disconnect()` する
- [x] `src/services/kot/open-kot.ts` を新規作成する
  - `auth.ts` の `openAuthenticatedKotPage` を利用する
  - 成功時は `browser.disconnect()` してユーザーにブラウザを渡す
- [x] `src/services/kot/open-request.ts` を新規作成する
  - 独自に Puppeteer を起動し申請 URL へログインする
  - 成功時は `browser.disconnect()` する
- [x] **CHECKPOINT**: `services/kot/` の全 4 ファイルが実装され、ビルドが通る

### Phase 3.3: `platform/` への移動

- [x] `src/platform/streamdeck/settings/punch-settings.ts` を新規作成する
  - `KotPunchSettings` 型・`hasRequiredSettings`・`hasRequiredPunchSettings`・`getGlobalSettings` を実装する
- [x] `src/platform/streamdeck/settings/request-settings.ts` を新規作成する
  - `RequestSettings` 型・`hasRequiredRequestSettings`・`getRequestSettings` を実装する
- [x] `src/lib/logger.ts` を `src/platform/streamdeck/logger.ts` へ移動する
- [x] `src/lib/showErrorImage.ts` を `src/platform/streamdeck/show-error-image.ts` へ移動する（ファイル名をケバブケースに統一）
- [x] `src/lib/notify.ts` を `src/platform/desktop/notify.ts` へ移動する
- [x] **CHECKPOINT**: `platform/` 配下の全ファイルが揃い、import エラーがない

### Phase 3.4: `shared/` への移動

- [x] `src/lib/long-press.ts` を `src/shared/long-press.ts` へ移動する
- [x] **CHECKPOINT**: `shared/long-press.ts` が正しく配置され、参照元が更新されている

### Phase 3.5: `actions/punch/base-punch-action.ts` の作成と移行

- [x] `src/actions/punch/base-punch-action.ts` を新規作成する
  - `_isProcessing` フラグ・`pressTracker`・`onKeyDown`・`onKeyUp` の全共通ロジックを実装する
  - abstract プロパティ: `logger: LoggerScope` / `selector: PunchSelector` / `successMessage: string`
  - catch ブロックの `setState(0)` は `void` で fire-and-forget にして元の例外がマスクされないようにする
- [x] `src/actions/clock-in.ts` を `BasePunchAction` 継承に切り替え、差分 3 箇所のみ残す
- [x] `src/actions/clock-out.ts` を同様に切り替える
- [x] `src/actions/open-kot.ts` の import パスを新構造に更新する
- [x] `src/actions/open-request.ts` の import パスを新構造に更新する
- [x] `src/plugin.ts` の import パスを確認・更新する
- [x] **CHECKPOINT**: 全アクションが新構造の import パスで動作し、`bun run build` が通る

### Phase 3.6: テストファイルの移行と mock パス更新

- [x] `src/lib/__tests__/long-press.test.ts` を `src/shared/__tests__/long-press.test.ts` へ移動する
- [x] `src/lib/__tests__/settings.test.ts` を `src/platform/streamdeck/settings/__tests__/punch-settings.test.ts` へ移動し、`request-settings.test.ts` を新規追加する
- [x] `src/lib/__tests__/notify.test.ts` を `src/platform/desktop/__tests__/notify.test.ts` へ移動する
- [x] `src/lib/__tests__/showErrorImage.test.ts` を `src/platform/streamdeck/__tests__/show-error-image.test.ts` へ移動する
- [x] `src/lib/__tests__/puppeteer.test.ts` を `src/services/kot/__tests__/` 配下の 4 ファイルに分割する
  - `auth.test.ts`: 認証フロー・dialog 検出・ブラウザ起動オプション
  - `punch.test.ts`: 打刻操作・dry-run 分岐
  - `open-kot.test.ts`: KOT ページオープン
  - `open-request.test.ts`: 申請画面ログイン
- [x] `src/lib/__tests__/manifest.test.ts` / `manifest-template.test.ts` / `runtime-dependencies.test.ts` を `src/__tests__/` へ移動する
- [x] `src/actions/__tests__/clock-in.test.ts` / `clock-out.test.ts` の mock パスを新構造に更新する（`BasePunchAction` 経由のテスト構造に対応）
- [x] `src/actions/__tests__/open-kot.test.ts` / `open-request.test.ts` の mock パスを新構造に更新する
- [x] **CHECKPOINT**: `bun run test` で全テストが pass する

### Phase 3.7: アーキテクチャテストの追加と最終検証

- [x] `src/__tests__/architecture.test.ts` を新規作成する
  - 新ディレクトリ構造の全ファイルが存在することを確認する
  - 旧 `src/lib/` の全ファイルが存在しないことを確認する
  - TypeScript 相対 import に `.js` 拡張子が含まれないことを確認する
- [x] `src/lib/` ディレクトリ（旧ファイル全て）を削除する
- [x] `bun run lint && bun run test && bunx tsc --noEmit && bun run build` を実行し、回帰がないことを確認する
- [x] **CHECKPOINT**: 全テスト pass・型エラーゼロ・ビルド成功・`src/lib/` 不在

---

## INTEGRATION-LATER（今回スコープ外）

以下は振る舞いを変えずに品質をさらに改善できる項目。別タスクとして切り出す。

- `OpenKot` / `OpenRequest` の `_isProcessing` パターンを `BasePageOpenAction<T>` に統一する
- `hasRequired*` 関数を `platform/streamdeck/settings/validation.ts` として分離する
- `auth.ts` と `open-request.ts` の Puppeteer 起動オプションを `shared/puppeteer.ts` の `createBrowser()` に一元化する
- `platform/streamdeck/logger.ts` の `createScope` を直接エクスポートし、固定スコープ一覧の `logger` オブジェクトを廃止する
- `platform/streamdeck/show-error-image.ts` のモジュール読み込み時 IIFE を初回呼び出し時の遅延読み込みに変更する
