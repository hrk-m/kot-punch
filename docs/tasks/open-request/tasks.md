# Tasks: open-request（申請画面を開く）

## 概要

Stream Deck の「申請画面を開く」ボタンを押下すると、Puppeteer が `https://s3.ta.kingoftime.jp/admin`
のログインフォームに自動入力してログインし、ブラウザをユーザーに引き渡す。

---

## Phase 1: Impact and Change Analysis

### Phase 1.1: 関連実装を調査する

- [x] `src/actions/open-kot.ts` の既存パターンを読む（`onKeyUp` / `_isProcessing` ガード / エラーハンドリング）
- [x] `src/lib/settings.ts` の設定型・必須チェック関数パターンを確認する
- [x] `src/lib/puppeteer.ts` の `openKotPage()` / `punchKot()` 構造を確認する
- [x] `src/plugin.ts` の `registerAction` 登録パターンを確認する
- [x] `manifest.template.json` の `Actions` 配列の構造を確認する
- [x] 既存 Property Inspector HTML の構造を確認する

### Phase 1.2: 変更候補を特定する

- [x] 影響/改修ファイルを列挙し、変更理由を整理する
  - `src/actions/open-request.ts`（新規）: `OpenRequest` クラス（UUID: `com.hrk-m.kot-punch.open-request`）
  - `src/lib/settings.ts`（更新）: `RequestSettings` / `getRequestSettings()` / `hasRequiredRequestSettings()`
  - `src/lib/puppeteer.ts`（更新）: `openRequestPage(settings: RequestSettings)` を実装
  - `src/plugin.ts`（更新）: `OpenRequest` を `registerAction` に追加
  - `manifest.template.json`（更新）: `open-request` アクション定義を追加
  - `com.hrk-m.kot-punch.sdPlugin/ui/open-request.html`（新規）: Property Inspector（`requestUrl` / `requestUsername` / `requestPassword`）
  - `com.hrk-m.kot-punch.sdPlugin/imgs/actions/open-request/`（新規）: 申請画面アイコン
- [x] 変更しないファイルを確認する
  - `src/lib/showErrorImage.ts`: 既存ロジックを流用
  - `setupAuthenticatedPage()`（JWT ロジック）: 認証方式が異なるため共通化しない
- [x] **CHECKPOINT**: 変更対象ファイルと影響範囲が明確

---

## Phase 2: Mock Empty-State Baseline

### Phase 2.1: モック契約を固定する

- [x] **MOCK-CONTRACT**: `RequestSettings` 型を確定する
  ```typescript
  export type RequestSettings = {
    requestUrl?: string;
    requestUsername?: string;
    requestPassword?: string;
  };
  ```
- [x] **MOCK-CONTRACT**: `hasRequiredRequestSettings()` のシグネチャを確定する
  ```typescript
  export function hasRequiredRequestSettings(s: RequestSettings): boolean
  ```
- [x] **MOCK-CONTRACT**: `openRequestPage()` のシグネチャを確定する
  ```typescript
  export async function openRequestPage(settings: RequestSettings): Promise<void>
  ```
- [x] **MOCK-CONTRACT**: アクション状態遷移を確定する
  - 設定あり・成功: `openRequestPage()` 実行後にブラウザをユーザーへ引き渡す
  - 設定なし: `showAlert()`
  - エラー時: `showErrorImage(ev.action)`
  - 連打: `_isProcessing` でガード

### Phase 2.2: 空モックで全体を成立させる

- [x] `src/actions/open-request.ts` を作成し、`onKeyUp` の基本制御を実装する
- [x] `src/lib/settings.ts` に `RequestSettings` と必須チェック関数を追加する
- [x] `src/lib/puppeteer.ts` に `openRequestPage()` スタブを追加する
- [x] `src/plugin.ts` に `OpenRequest` の `registerAction` を追加する
- [x] `manifest.template.json` に `open-request` エントリを追加し `bun run generate-manifest` を実行する
- [x] `com.hrk-m.kot-punch.sdPlugin/ui/open-request.html` を作成する
- [x] アイコン画像を `imgs/actions/open-request/` に配置する
- [x] `bun run build` が通ることを確認する
- [x] **CHECKPOINT**: 空モックで end-to-end の経路が成立

---

## Phase 3: Progressive Fill-In from Critical Paths

### Phase 3.1: 穴埋め対象を優先度付けする

- [x] モック箇所を洗い出す
  1. (高) `openRequestPage()` の実 Puppeteer 実装
  2. (高) ログイン成功/失敗の判定（ナビゲーション成否）
  3. (中) `OpenRequest` の状態遷移テスト
  4. (中) `getRequestSettings()` の設定取得テスト

### Phase 3.2: openRequestPage() を実装する

- [x] `src/lib/puppeteer.ts` の `openRequestPage()` を実装する（TDD: RED → GREEN）
  - `puppeteer.launch(...)` → `page.goto(requestUrl)` → フォーム入力 → submit → `browser.disconnect()`
  - 入力:
    - `page.type("#login_id", requestUsername)`
    - `page.type("#login_password", requestPassword)`
  - submit:
    - `Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.click("#login_button")])`
  - 例外時: `browser.close()` して rethrow

### Phase 3.3: アクション/設定のユニットテストを作成する

- [x] `src/actions/__tests__/open-request.test.ts` を作成する
  - テストケース 8 件: 成功 / 成功後リセット / 設定なし / 設定なし後リセット / エラー表示 / エラー後リセット / 連打防止 / 引数検証
- [x] `src/lib/__tests__/settings-request.test.ts` を追加する
  - `getRequestSettings()` が `requestUrl` / `requestUsername` / `requestPassword` を返すことを検証
- [x] `src/lib/__tests__/settings.test.ts` で `hasRequiredRequestSettings()` を検証する
- [x] `src/lib/__tests__/puppeteer.test.ts` で `openRequestPage()` の操作順序・入力値・例外時クリーンアップを検証する
- [x] `bun run lint && bun run test && bunx tsc --noEmit && bun run build` が通ることを確認する（69 tests pass）
- [x] **CHECKPOINT**: 主要ユースケースが自動テストで再現可能

---

## INTEGRATION-LATER

- 実 Chrome での手動 E2E（実際の `requestUrl` / `requestUsername` / `requestPassword`）
- ログインフォームセレクタ（`#login_id` / `#login_password` / `#login_button`）の実 HTML との一致確認
- アイコン素材の最終差し替え
