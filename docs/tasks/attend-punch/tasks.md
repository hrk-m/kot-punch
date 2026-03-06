# Tasks: attend-punch（出勤打刻 Puppeteer 統合）

## 概要

既存の `ClockIn`（表示切り替えのみ）に Puppeteer 打刻・設定管理を追加する。
`punch-clock-buttons` タスクの `INTEGRATION-LATER` として切り出された作業。

---

## Phase 1: Impact and Change Analysis

### Phase 1.1: 関連実装を調査する

- [ ] `src/actions/clock-in.ts` を読む（現状の setTitle パターンを把握）
- [ ] `src/lib/puppeteer.ts` を読む（`openKotPage` の構造・認証フローを把握）
- [ ] `src/lib/settings.ts` を読む（`GlobalSettings` 型・`hasRequiredSettings` 判定条件を把握）
- [ ] `src/actions/__tests__/clock-in.test.ts` を読む（既存テスト構造・モックパターンを把握）
- [ ]* `src/lib/__tests__/puppeteer.test.ts` を俯瞰する

**調査メモ:**
- `ClockSettings`（action-level）は `punched?: boolean` のみ。Global Settings（認証情報）は `getGlobalSettings()` で別途取得
- `punchKot` 完了後は `browser.close()`（`openKotPage` の `disconnect()` とは異なる）
- 既存テストの `makeSharedAction` に `setState` / `showOk` / `showAlert` がないため Phase 3 で追加が必要

### Phase 1.2: 変更候補を特定する

- [ ] 影響/改修ファイルを列挙し、変更理由を 1 行で記載する
  - `src/actions/clock-in.ts`（更新）: Puppeteer 呼び出し・処理中フラグ・State 1 リセットを追加
  - `src/lib/puppeteer.ts`（更新）: `punchKot(selector, settings)` 関数を追加
  - `src/lib/settings.ts`（更新）: `username` / `password` / `dryRun` を型定義に追加し `hasRequiredSettings` の判定条件を更新
  - `com.hrk-m.kot-punch.sdPlugin/ui/clock-in.html`（更新済み）: 設定入力 Property Inspector（既に完成）
  - `src/actions/__tests__/clock-in.test.ts`（更新）: Puppeteer モック・処理中ガードのテストを追加
  - `src/lib/__tests__/puppeteer.test.ts`（更新）: `punchKot` のテストを追加
- [ ] 変更しないファイルを確認する: `src/actions/clock-out.ts`・`src/actions/open-kot.ts`・`src/lib/showErrorImage.ts`
- [ ] **CHECKPOINT**: 変更対象ファイルと影響範囲が明確

---

## Phase 2: Mock Empty-State Baseline

### Phase 2.1: モック契約を固定する（**MOCK-CONTRACT**）

- [ ] **MOCK-CONTRACT**: 拡張後の `GlobalSettings` 型を定義する
  ```typescript
  export type GlobalSettings = {
    kingOfTimeUrl?: string;
    tokenKey?: string;
    token?: string;
    username?: string;       // 追加: KOT 画面上に表示される名前
    password?: string;       // 追加: 打刻確認時のパスワード
    dryRun?: boolean;        // 追加: true のとき submit をスキップ
  };
  ```
- [ ] **MOCK-CONTRACT**: `punchKot` の関数シグネチャを定義する
  ```typescript
  export async function punchKot(
    selector: "#attend" | "#leave",
    settings: GlobalSettings
  ): Promise<void>
  ```
- [ ] **MOCK-CONTRACT**: `hasRequiredSettings` の判定条件を確定する
  - 必須: `kingOfTimeUrl` + `tokenKey` + `token` + `username` + `password`
- [ ] **MOCK-CONTRACT**: `ClockIn` の状態遷移を確定する
  - `state = 0` かつ `_isProcessing = false` → ボタンを押すと打刻実行
  - `state = 0` かつ `_isProcessing = true` → `onKeyUp` で即 return（連打防止）
  - `state = 1` → ボタンを押すと State 0 にリセット（Puppeteer なし）

### Phase 2.2: 空モックで全体を成立させる（**MOCK-IMPL**）

- [ ] **MOCK-IMPL**: `src/lib/settings.ts` の `GlobalSettings` 型に `username` / `password` / `dryRun` を追加し `hasRequiredSettings` を更新する

- [ ] **MOCK-IMPL**: `src/lib/puppeteer.ts` に `punchKot` 関数をスタブ実装する（即 resolve、実際のブラウザ操作なし）
  ```typescript
  export async function punchKot(selector: "#attend" | "#leave", settings: GlobalSettings): Promise<void> {
    // MOCK-IMPL: 後で実装する
    return Promise.resolve();
  }
  ```
- [ ] **MOCK-IMPL**: `src/actions/clock-in.ts` を拡張する
  - `_isProcessing` フラグを追加し `onKeyUp` 冒頭でガード（`_isProcessing = true` なら即 return）
  - `onKeyUp` State 0 処理: 設定確認 → `_isProcessing = true` → `punchKot` 呼び出し（モック）→ 成功: `showOk()` + `setState(1)` → 完了時 `_isProcessing = false`
  - `onKeyUp` State 1 処理: `setState(0)`（Puppeteer なし）
  - 失敗時: `showErrorImage(ev.action)` を fire-and-forget で呼び `setState(0)` + `_isProcessing = false`
- [ ] **MOCK-IMPL**: `com.hrk-m.kot-punch.sdPlugin/ui/clock-in.html` を作成する（フォーム項目を持つ Property Inspector。`dryRun` チェックボックス含む）
- [ ] `bun run build` でビルドが通ることを確認する
- [ ] **CHECKPOINT**: dryRun=true 相当（モック）で end-to-end 実行可能。ボタンを押すと State 1 遷移、再度押すと State 0 リセットが確認できる

---

## Phase 3: Progressive Fill-In from Critical Paths

### Phase 3.1: 穴埋め対象を優先度付けする

- [ ] モック実装箇所を洗い出す
  1. (高) `setupAuthenticatedPage` の抽出: `openKotPage` の認証フローを内部ヘルパーへ共通化 → `punchKot` も再利用（3.2.0）
  2. (高) `punchKot` の実ブラウザ操作: `#attend` クリック → ユーザー選択 → パスワード入力 → submit（3.2.1）
  3. (低) `dryRun=true` のとき submit をスキップする分岐（3.2.1 に含む）
  - ~~(中) 設定未完了ガード~~ → Phase 2 で実装済み（`ClockIn.onKeyUp` の `showAlert()` 呼び出し）

### Phase 3.2: 重要処理から穴埋めする

#### 3.2.0 認証フロー共通化（`src/lib/puppeteer.ts`）

- [ ] **MOCK-CONTRACT**: 内部ヘルパーのシグネチャを定義する
  ```typescript
  // モジュール内部専用（export しない）
  async function setupAuthenticatedPage(settings: GlobalSettings): Promise<{
      browser: Browser;
      page: Page;
  }>
  ```
  - ブラウザ起動 → goto（domain 確立）→ setCookie → dialog ハンドラ登録 → goto（認証適用）→ 認証失敗時に throw
  - `openKotPage` はこのヘルパーを呼び、完了後 `browser.disconnect()`（ウィンドウを残す）
  - `punchKot` はこのヘルパーを呼び、打刻操作後 `browser.close()`（ウィンドウを閉じる）
- [ ] **MOCK-IMPL**: `openKotPage` をヘルパー呼び出しにリファクタリングする
  - `openKotPage` の認証ロジックを `setupAuthenticatedPage` に抽出する
  - `openKotPage` は `setupAuthenticatedPage` を使い `browser.disconnect()` で終了する
  - `openKotPage` の既存テスト（`src/lib/__tests__/puppeteer.test.ts`）が全て pass することを確認する
- [ ] ユースケース（リファクタ後）— 操作前提: 設定あり / 操作: `openKotPage(settings)` / 期待結果: 認証フロー実行後 disconnect する（既存動作を維持）

#### 3.2.1 `punchKot` の実装（`src/lib/puppeteer.ts`）

- [ ] `setupAuthenticatedPage` を使い打刻ロジックを実装する
  - `setupAuthenticatedPage` で認証済みページを取得する
  - `selector`（`#attend`）をクリックする（`page.click(selector)`）
  - `username` でユーザー要素を探してクリックする（`page.click` + テキスト照合）
  - パスワードフィールドに `type({ delay: 100 })` で入力する
  - `dryRun=false` のときのみ submit クリックする（`page.click("button[type=submit]")`）
  - 完了後 `browser.close()` する
- [ ] ユースケース — 操作前提: 設定あり / 操作: `punchKot("#attend", settings)` / 期待結果: 認証フロー後 `#attend` クリック → パスワード入力 → submit が実行される
- [ ] ユースケース — 操作前提: `dryRun=true` / 操作: `punchKot` / 期待結果: submit がスキップされる
- [ ] ユースケース — 操作前提: 認証失敗（ダイアログ発生）/ 操作: `punchKot` / 期待結果: エラーを throw しブラウザを閉じる

#### 3.2.2 `ClockIn` の統合テスト追加（`src/actions/__tests__/clock-in.test.ts`）

- [ ] 処理中ガードのテスト: `_isProcessing=true` のとき `onKeyUp` が即 return することを検証
- [ ] State 0 打刻成功フロー: `punchKot` をモックで成功させ、`showOk()` + `setState(1)` を検証
- [ ] State 0 打刻失敗フロー: `punchKot` がエラーを throw したとき `showErrorImage()` + `setState(0)` が呼ばれることを検証
- [ ] State 1 リセットフロー: State 1 でボタンを押すと `setState(0)` が呼ばれ Puppeteer は起動しないことを検証
- [ ] 設定未完了フロー: `hasRequiredSettings=false` のとき `showAlert()` が呼ばれることを検証

#### 3.2.3 `punchKot` のユニットテスト（`src/lib/__tests__/puppeteer.test.ts`）

- [ ] `punchKot` を既存の `vi.mock("puppeteer")` モック構造に追記してテストする
  - `mockClick` / `mockType` を追加し `page` モックに含める
  - `mockClose` は既存のものを再利用する（`openKotPage` と `punchKot` で共有）
- [ ] `dryRun=false`: `page.click("button[type=submit]")` が呼ばれることを検証
- [ ] `dryRun=true`: submit クリックがスキップされることを検証
- [ ] 認証失敗（dialog イベント）: エラーが throw されブラウザが閉じることを検証
- [ ] リファクタ後の `openKotPage` テスト: 既存の 8 テストが全て pass することを確認する

### Phase 3.3: 最終検証

- [ ] `bun run test` で全ユニットテスト pass を確認する（44 tests passed）
- [ ] `bun run build` でビルド成功を確認する（slowMo/delay/dryRun disconnect 対応後も確認済み）
- [ ] Stream Deck 実機で `dryRun=true` 設定にしてボタンを押す → State 1 遷移を確認する
- [ ] Stream Deck 実機で State 1 の状態でボタンを押す → State 0 リセットを確認する
- [ ] **CHECKPOINT**: 主要ユースケースがモック（dryRun）で再現可能、ビルド成功

**INTEGRATION-LATER**: 実 KOT 環境での打刻動作確認（実 URL・実トークンを使った E2E 検証）
