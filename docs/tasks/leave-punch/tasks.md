# Tasks: leave-punch（退勤打刻 Puppeteer 統合）

## 概要

既存の `ClockOut`（長押しリセット + ローカル設定の旧実装）を、`ClockIn` と同パターンに全面刷新する。
`puppeteer.ts` の `punchKot("#leave", settings)` はすでに実装済みのため、`clock-out.ts` と対応テストの書き換えが主作業。

### 確定した方針

- **共通化**: 見送り。`ClockIn` と同じ構造を `ClockOut` に独立実装する（差分はセレクタのみ）
- **Phase 2 スコープ**: `clock-out.ts` の書き換え + `clock-out.test.ts` の書き換え + `puppeteer.test.ts` への `#leave` テスト追記

---

## Phase 1: Impact and Change Analysis

### Phase 1.1: 関連実装を調査する

- [ ] `src/actions/clock-out.ts` を読む（旧実装の構造・削除対象を把握）
- [ ] `src/actions/clock-in.ts` を読む（新パターンを把握し、差分箇所を特定）
- [ ] `src/actions/__tests__/clock-out.test.ts` を読む（旧テストの構造・削除対象を把握）
- [ ] `src/lib/puppeteer.ts` を読む（`punchKot("#leave")` の実装済み状態を確認）
- [ ] `src/lib/settings.ts` を読む（`username` / `password` / `dryRun` が追加済みであることを確認）
- [ ]* `src/lib/__tests__/puppeteer.test.ts` を俯瞰する（`#leave` テスト追記の準備）

### Phase 1.2: 変更候補を特定する

- [ ] 影響/改修ファイルを列挙し、変更理由を 1 行で記載する
  - `src/actions/clock-out.ts`（全面書き換え）: 旧実装（長押し + ローカル設定）を削除し、ClockIn 同パターン（`_isProcessing` フラグ・State 0/1・`punchKot("#leave")`）に刷新
  - `src/actions/__tests__/clock-out.test.ts`（全面書き換え）: 旧テスト（`onWillAppear` / `onKeyDown` / 長押しリセット）を削除し、新仕様（連打防止・State 遷移・Puppeteer モック）に書き換え
  - `src/lib/__tests__/puppeteer.test.ts`（確認）: `punchKot("#leave")` テストはすでに存在（line 222-228）→ 変更なし
- [ ] 変更しないファイルを確認する
  - `src/lib/puppeteer.ts`: `punchKot("#leave")` 実装済み → 変更なし
  - `src/lib/settings.ts`: `username` / `password` / `dryRun` 追加済み → 変更なし
  - `src/actions/clock-in.ts` / `src/actions/open-kot.ts` → 変更なし
  - `com.hrk-m.kot-punch.sdPlugin/` 配下: `manifest.json` / `ui/` → 変更なし
- [ ] **CHECKPOINT**: 変更対象ファイルと影響範囲が明確

---

## Phase 2: Mock Empty-State Baseline

### Phase 2.1: モック契約を固定する（**MOCK-CONTRACT**）

- [ ] **MOCK-CONTRACT**: `ClockOut` の状態遷移を確定する
  - `state = 0` かつ `_isProcessing = false` → ボタンを押すと打刻実行
  - `state = 0` かつ `_isProcessing = true` → `onKeyUp` で即 return（連打防止）
  - `state = 1` → ボタンを押すと State 0 にリセット（Puppeteer なし）
- [ ] **MOCK-CONTRACT**: `onKeyUp` 呼び出しシグネチャを確定する（`clock-in.ts` と同一）
  ```typescript
  override async onKeyUp(ev: KeyUpEvent): Promise<void>
  // ev.payload.state: 0 | 1
  // ev.action: { setState, showOk, showAlert }
  ```
- [ ] **MOCK-CONTRACT**: テストで使う共通 action スタブを確定する
  ```typescript
  // makeSharedAction() に追加が必要なメソッド
  { setState, showOk, showAlert }
  ```

### Phase 2.2: 空モックで全体を成立させる（**MOCK-IMPL**）

- [ ] **MOCK-IMPL**: `src/actions/clock-out.ts` を全面書き換えする
  - クラス名 `ClockOut`・UUID `com.hrk-m.kot-punch.clock-out` を維持
  - `_isProcessing` フラグを追加し `onKeyUp` 冒頭でガード（`_isProcessing = true` なら即 return）
  - `onKeyUp` State 0 処理: 設定確認（`hasRequiredPunchSettings`）→ `_isProcessing = true` → `punchKot("#leave", settings)` 呼び出し → 成功: `showOk()` + `setState(1)` → 完了時 `_isProcessing = false`
  - `onKeyUp` State 1 処理: `setState(0)`（Puppeteer なし）
  - 失敗時: `void showErrorImage(ev.action)` を fire-and-forget で呼び `setState(0)` + `_isProcessing = false`
  - `onWillAppear` / `onKeyDown` / 長押しタイマー関連コードをすべて削除する
- [ ] **MOCK-IMPL**: `src/actions/__tests__/clock-out.test.ts` を全面書き換えする
  - `makeSharedAction()` に `setState` / `showOk` / `showAlert` を追加する
  - `punchKot` を `vi.mock("../../lib/puppeteer.js")` でスタブ化する（即 resolve）
  - `getGlobalSettings` / `hasRequiredPunchSettings` をモックする
  - 5 ケースのテストを記述する（成功・失敗・State 1 リセット・設定未完了・連打防止）
- [ ] `bun run build` でビルドが通ることを確認する
- [ ] `bun run test` で既存テストが pass することを確認する（44 tests passed）
- [ ] **CHECKPOINT**: モック状態で end-to-end 実行可能。State 0 → 押す → State 1、State 1 → 押す → State 0 が確認できる

---

## Phase 3: Progressive Fill-In from Critical Paths

### Phase 3.1: 穴埋め対象を優先度付けする

- [ ] モック実装箇所を洗い出す
  1. (高) `ClockOut.onKeyUp` の全ユースケースカバレッジ（State 遷移・連打防止・エラーフロー・設定未完了）→ 3.2.1
  2. (高) `punchKot("#leave")` のユニットテスト追記（既存 `#attend` テストとモック構造を共有）→ 3.2.2
  3. (低) Stream Deck 実機での動作確認 → 3.2.3

### Phase 3.2: 重要処理から穴埋めする

#### 3.2.1 `ClockOut` のテスト網羅（`src/actions/__tests__/clock-out.test.ts`）

- [ ] 連打防止フロー: `_isProcessing=true` のとき `onKeyUp` が即 return し `setState` / `punchKot` が呼ばれないことを検証
  - 操作前提: `_isProcessing=true`（処理中状態）/ 操作: `onKeyUp` / 期待結果: 何も呼ばれない
- [ ] State 0 打刻成功フロー: `punchKot` モックが resolve のとき `showOk()` + `setState(1)` が呼ばれることを検証
  - 操作前提: `state=0`, `_isProcessing=false`, 設定あり / 操作: `onKeyUp` / 期待結果: `showOk` + `setState(1)` 呼び出し
- [ ] State 0 打刻失敗フロー: `punchKot` がエラーを throw したとき `showErrorImage()` + `setState(0)` が呼ばれることを検証
  - 操作前提: `state=0`, `punchKot` が throw / 操作: `onKeyUp` / 期待結果: `showErrorImage` + `setState(0)` 呼び出し
- [ ] State 1 リセットフロー: State 1 でボタンを押すと `setState(0)` が呼ばれ `punchKot` は起動しないことを検証
  - 操作前提: `state=1` / 操作: `onKeyUp` / 期待結果: `setState(0)` のみ。`punchKot` は呼ばれない
- [ ] 設定未完了フロー: `hasRequiredPunchSettings=false` のとき `showAlert()` が呼ばれ `punchKot` は起動しないことを検証
  - 操作前提: `state=0`, 設定未完了 / 操作: `onKeyUp` / 期待結果: `showAlert` 呼び出し。`punchKot` は呼ばれない

#### 3.2.2 `punchKot("#leave")` のテスト（`src/lib/__tests__/puppeteer.test.ts`）

- [ ] `#leave` テストは `puppeteer.test.ts` line 222-228 にすでに存在していたため追記不要
  - `punchKot("#leave", { ...settings, dryRun: true })` → `click("#leave")` が呼ばれることを検証済み

#### 3.2.3 最終検証

- [ ] `bun run test` で全ユニットテスト pass を確認する（44 tests passed）
- [ ] `bun run build` でビルド成功を確認する
- [ ] Stream Deck 実機で `dryRun=true` 設定にしてボタンを押す → State 1 遷移を確認する
- [ ] Stream Deck 実機で State 1 の状態でボタンを押す → State 0 リセットを確認する
- [ ] **CHECKPOINT**: 主要ユースケースがモック（dryRun）で再現可能、ビルド成功

**INTEGRATION-LATER**: 実 KOT 環境での退勤打刻動作確認（実 URL・実トークンを使った E2E 検証）
