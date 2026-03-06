# Tasks: open-admin-authenticated（認証済み勤怠画面オープン）

## 概要

Stream Deck の「勤怠画面を開く」ボタンを押下すると、JWT クッキーをセット済みの Chrome ウィンドウで
KOT 勤怠画面（`kingOfTimeUrl`）を開く。`puppeteer-core` でシステム Chrome を起動し、
cookie セット後に `browser.disconnect()` でウィンドウを残したまま切断する。

---

## Phase 1: Impact and Change Analysis

### Phase 1.1: 関連実装を調査する

- [x] `src/actions/clock-in.ts` の既存パターンを読む（`onKeyDown` / `onKeyUp` / `onWillAppear` の実装方法）
  - `SingletonAction<Settings>` 継承、`@action` デコレータ、3 イベントで構成
  - 連打防止は `_isLongPress` フラグで管理（今回は `_isProcessing` に対応）
- [x] `src/plugin.ts` の `registerAction` 登録パターンを確認する
  - `streamDeck.actions.registerAction(new ClassName())` のみ、シンプル
- [x] `manifest.json` の Actions 配列の構造を確認する
  - 必須フィールド: Name / UUID / Icon / Tooltip / PropertyInspectorPath / Controllers / States
- [x] `com.hrk-m.kot-punch.sdPlugin/ui/` の Property Inspector HTML の構造を確認する
  - 現存ファイルは空 body のみ。`open-admin.html` は sdpi-components で入力フォームを実装する必要あり
- [x] `package.json` に `puppeteer-core` が含まれているかを確認する
  - **未インストール**。`dependencies` には `@elgato/streamdeck` のみ。Phase 3 で `bun add puppeteer-core` が必要
- [ ]* 参照実装 `attend-kingoftime/src/punch-script.ts` の cookie セット手順を再確認する

### Phase 1.2: 変更候補を特定する

- [x] 影響/改修ファイルを列挙し、変更理由を 1 行で記載する
  - `src/actions/open-admin-action.ts`（新規作成）: `OpenAdminAction` クラス。UUID `com.hrk-m.kot-punch.open-admin`
  - `src/lib/puppeteer.ts`（新規作成）: `openKotPage()` 関数。Puppeteer 操作ロジックを集約
  - `src/lib/settings.ts`（新規作成）: Global Settings 読み書きヘルパー（`kingOfTimeUrl` / `tokenKey` / `token` の取得・バリデーション）
  - `src/plugin.ts`（更新）: `OpenAdminAction` を `registerAction` に追加
  - `manifest.json`（更新）: `Actions` 配列に `com.hrk-m.kot-punch.open-admin` エントリを追加
  - `com.hrk-m.kot-punch.sdPlugin/ui/open-admin.html`（新規作成）: Property Inspector（`kingOfTimeUrl` / `tokenKey` / `token` 入力フォーム、sdpi-components 使用）
  - `imgs/actions/open-admin/`（新規作成）: 勤怠画面アイコン（icon + key、通常 + @2x）
  - `package.json`（更新）: `puppeteer-core` を dependencies に追加
- [x] 変更しないファイルを確認する: `src/actions/clock-in.ts`・`clock-out.ts` および既存テスト
- [x] **CHECKPOINT**: 変更対象ファイルと影響範囲が明確

---

## Phase 2: Mock Empty-State Baseline

### Phase 2.1: モック契約を固定する（**MOCK-CONTRACT**）

- [x] **MOCK-CONTRACT**: `GlobalSettings` 型を `src/lib/settings.ts` に定義する
  ```typescript
  type GlobalSettings = {
    kingOfTimeUrl?: string;
    tokenKey?: string;
    token?: string;
  };
  ```
- [x] **MOCK-CONTRACT**: アクションの状態遷移を確定する
  - 初期状態: ボタン表示 → タイトルなし（アイコン表示）
  - 短押し（設定あり）: `setTitle("処理中...")` → `openKotPage()` 呼び出し → タイトルをリセット
  - 短押し（設定なし）: `showAlert()` で Property Inspector へ誘導
  - 処理中に再押下: 連打防止フラグで即 return
  - エラー発生: `showAlert()` + `setTitle("エラー")`
- [x] **MOCK-CONTRACT**: `openKotPage()` の関数シグネチャを定義する
  ```typescript
  // src/lib/puppeteer.ts
  export async function openKotPage(settings: GlobalSettings): Promise<void>
  ```

### Phase 2.2: 空モックで全体を成立させる（**MOCK-IMPL**）

- [x] **MOCK-IMPL**: `src/lib/settings.ts` を作成する（TDD: RED→GREEN 7テスト pass）
  - `getGlobalSettings()`: `streamDeck.settings.getGlobalSettings<GlobalSettings>()` をラップ
  - `hasRequiredSettings(s: GlobalSettings)`: `kingOfTimeUrl` / `tokenKey` / `token` が空でないことを検証して `boolean` を返す
- [x] **MOCK-IMPL**: `src/lib/puppeteer.ts` を作成する（モックスタブ）
  ```typescript
  // Phase 3 で実装を埋める。Phase 2 では即 resolve するスタブ
  export async function openKotPage(_settings: GlobalSettings): Promise<void> {
    // MOCK: stub — Chrome 起動処理は Phase 3 で実装
  }
  ```
- [x] **MOCK-IMPL**: `src/actions/open-admin-action.ts` を作成する
  - `@action({ UUID: "com.hrk-m.kot-punch.open-admin" })` デコレータ付与
  - `onKeyDown`: 処理中フラグが立っていれば即 return（連打防止）
  - `onKeyUp`: 設定チェック → `setTitle("処理中...")` → `openKotPage()` → タイトルリセット → エラー時 `showAlert()`
  - 処理中フラグ: `private _isProcessing = false` でガード
- [x] `src/plugin.ts` に `OpenAdminAction` を `registerAction` で登録する
- [x] `manifest.json` の `Actions` 配列に `open-admin` エントリを追加する（アイコンは既存の attend アイコンを仮用）
- [x] `com.hrk-m.kot-punch.sdPlugin/ui/open-admin.html` を作成する
  - `kingOfTimeUrl`（テキスト入力）、`tokenKey`（テキスト入力）、`token`（`sdpi-password` マスク入力）のフォーム（sdpi-components v3 CDN 使用）
- [x] アイコン画像: 既存 `imgs/actions/attend/icon` を仮用（manifest 参照のみ、Phase 3 以降に差し替え）
- [x] `bun run build` でビルドが通ることを確認する（777ms、エラーなし）
- [x] **CHECKPOINT**: 実データなし + 空モックで end-to-end 実行可能（ボタン押下で「処理中...」が表示される）

---

## Phase 3: Progressive Fill-In from Critical Paths

### Phase 3.1: 穴埋め対象を優先度付けする

- [x] Phase 2 で作成したモック箇所を洗い出す
  1. (高) `openKotPage()` の実 Puppeteer 実装（`src/lib/puppeteer.ts` — 空スタブ）
  2. (高) `getGlobalSettings()` の実 Global Settings 読み込み（`src/lib/settings.ts` — 実装済み）
  3. (高) 設定未完了時の `showAlert()` + Property Inspector 誘導（`open-admin-action.ts` — 実装済み）
  4. (中) 連打防止フラグの正確な reset（`open-admin-action.ts` `finally` で対応済み）
  5. (低) アイコン画像の本番用素材への差し替え（manifest で仮用中）

### Phase 3.2: `openKotPage()` を実装する

- [x] `puppeteer-core` を `bun add puppeteer-core` でインストールする（v24.38.0）
- [x] `src/lib/puppeteer.ts` に実装を埋める（TDD: RED 5テスト失敗 → GREEN 5テスト pass）
  - `goto(kingOfTimeUrl)` → `setCookie({ name, value })` → `goto(kingOfTimeUrl)` → `disconnect()` の順序をテストで担保
  - rollup ビルド対応: `@rollup/plugin-json` 追加・`inlineDynamicImports: true` 設定
  - ユースケース: 操作前提（kingOfTimeUrl・tokenKey・token が設定済み）/ 操作（ボタン短押し）/ 期待結果（Chrome が認証済み勤怠画面を表示したままになる）

### Phase 3.3: アクションの状態管理を完成させる

- [x] `onKeyDown` / `onKeyUp` の処理中フラグリセットを正確に実装する
  - ユースケース（成功）: 操作前提（設定あり、処理中でない）/ 操作（短押し）/ 期待結果（「処理中...」表示 → Chrome 起動 → タイトルリセット）
  - ユースケース（設定なし）: 操作前提（`kingOfTimeUrl` / `tokenKey` / `token` のいずれかが空）/ 操作（短押し）/ 期待結果（`showAlert()` が呼ばれ、`_isProcessing` が `false` に戻る）
  - ユースケース（エラー）: 操作前提（Puppeteer 例外）/ 操作（短押し）/ 期待結果（`showAlert()` + `setTitle("エラー")` + `_isProcessing` が `false` に戻る）
  - ユースケース（連打）: 操作前提（`_isProcessing = true`）/ 操作（再押下）/ 期待結果（即 return、重複処理なし）
- [x] `src/actions/__tests__/open-admin-action.test.ts` を作成する
  - `openKotPage` を `vi.mock("../lib/puppeteer")` でスタブ化して検証する
  - 上記 4 ユースケースに対応したテストケースを実装する
- [x] `bun run test` で全ユニットテスト pass を確認する（34 tests pass）
- [x] `bun run build` でビルド成功を確認する
- [x] **CHECKPOINT**: 主要ユースケースがモックで再現可能、全テスト pass

**INTEGRATION-LATER**: 実 Chrome での動作確認（実際の JWT トークンを使った手動 E2E テスト）
**INTEGRATION-LATER**: `browser.disconnect()` の代替検討（Puppeteer バージョンによる挙動差異の検証）
