# Tasks: punch-clock-buttons（出勤・退勤ボタン）

## 概要

Stream Deck に出勤・退勤の 2 アクションを追加する。
各ボタンは初期表示でラベル（`出勤` / `退勤`）を表示し、短押しで `✅` に切り替え、長押し（500ms）でリセットする。
Settings に状態を永続化し、プラグイン再起動後も打刻済み状態を保持する。

---

## Phase 1: Impact and Change Analysis

### Phase 1.1: 関連実装を調査する

- [x] `src/actions/increment-counter.ts` の既存パターンを読む（長押し検出・setTitle・setSettings の実装方法）
- [x] `manifest.json` の Actions 配列の構造を確認する
- [x] `com.hrk-m.kot-punch.sdPlugin/ui/` の Property Inspector HTML の構造を確認する
- [ ]* `src/actions/__tests__/` の既存テストを俯瞰し、モックパターンを把握する

### Phase 1.2: 変更候補を特定する

- [x] 影響/改修ファイルを列挙し、変更理由を 1 行で記載する
  - `src/actions/clock-in.ts`（新規作成）: 出勤アクションクラス。UUID `com.hrk-m.kot-punch.clock-in`
  - `src/actions/clock-out.ts`（新規作成）: 退勤アクションクラス。UUID `com.hrk-m.kot-punch.clock-out`
  - `src/actions/__tests__/clock-in.test.ts`（新規作成）: 出勤アクションのユニットテスト
  - `src/actions/__tests__/clock-out.test.ts`（新規作成）: 退勤アクションのユニットテスト
  - `src/plugin.ts`（更新）: 出勤・退勤アクションを `registerAction` に追加
  - `manifest.json`（更新）: `Actions` 配列に出勤・退勤アクションのエントリを追加
  - `com.hrk-m.kot-punch.sdPlugin/ui/clock-in.html`（新規作成）: 設定項目なしの空 Property Inspector
  - `com.hrk-m.kot-punch.sdPlugin/ui/clock-out.html`（新規作成）: 設定項目なしの空 Property Inspector
- [x] 変更しないファイルを確認する: `src/actions/increment-counter.ts`、既存テスト
- [x] **CHECKPOINT**: 変更対象ファイルと影響範囲が明確

---

## Phase 2: Mock Empty-State Baseline

### Phase 2.1: モック契約を固定する（**MOCK-CONTRACT**）

- [x] **MOCK-CONTRACT**: `ClockInSettings` / `ClockOutSettings` 型を定義する
  ```typescript
  type ClockSettings = {
    punched?: boolean; // true = 打刻済み（✅ 表示）
  };
  ```
- [x] **MOCK-CONTRACT**: ボタン表示値の定数を定義する
  ```typescript
  const LABEL = "出勤"; // または "退勤"
  const LABEL_PUNCHED = "✅";
  const LONG_PRESS_MS = 500;
  ```
- [x] **MOCK-CONTRACT**: アクションの状態遷移を確定する
  - `punched = false | undefined` → タイトル: `"出勤"` / `"退勤"`
  - `punched = true` → タイトル: `"✅"`
  - 長押し → `punched = false` にリセット → タイトル: ラベルに戻す

### Phase 2.2: 空モックで全体を成立させる（**MOCK-IMPL**）

- [x] **MOCK-IMPL**: `src/actions/clock-in.ts` を作成する
  - `@action({ UUID: "com.hrk-m.kot-punch.clock-in" })` デコレータ付与
  - `onWillAppear`: `punched` が `true` なら `"✅"`、それ以外は `"出勤"` を `setTitle`
  - `onKeyDown`: 長押しタイマー起動（`_longPressTimer` / `_isLongPress` パターン）
  - `onKeyUp`: 短押し判定 → `punched = true` に `setSettings` → `"✅"` を `setTitle`
  - 長押し時: `punched = false` に `setSettings` → `"出勤"` を `setTitle`
- [x] **MOCK-IMPL**: `src/actions/clock-out.ts` を作成する（`clock-in` と同構成で `"退勤"` ラベル使用）
- [x] `src/plugin.ts` に両アクションを `registerAction` 登録する
- [x] `manifest.json` の `Actions` 配列に出勤・退勤エントリを追加する
- [x] `com.hrk-m.kot-punch.sdPlugin/ui/clock-in.html` と `clock-out.html` を空 body で作成する
- [x] `bun run build` でビルドが通ることを確認する（881ms、エラーなし）
- [x] **CHECKPOINT**: 実データなし + 空モックで end-to-end 実行可能（Stream Deck にボタンが表示される）

---

## Phase 3: Progressive Fill-In from Critical Paths

### Phase 3.1: 穴埋め対象を優先度付けする

- [x] テスト未カバーの箇所を洗い出す
  1. (高) 短押しで `punched = true`・タイトル `✅` になることの検証
  2. (高) 長押しで `punched = false`・タイトルがラベルに戻ることの検証
  3. (高) `onWillAppear` で `punched` 状態に応じた初期タイトルの検証
  4. (中) 長押しタイマー発火後に `onKeyUp` が来ても短押しアクションが実行されないことの検証

### Phase 3.2: ユニットテストを実装する

#### 3.2.1 出勤ボタン: `clock-in.test.ts`

- [x] `onWillAppear` テスト
  - 操作前提: `punched = undefined` → 操作: `onWillAppear` → 期待結果: `setTitle("出勤")` が呼ばれる
  - 操作前提: `punched = true` → 操作: `onWillAppear` → 期待結果: `setTitle("✅")` が呼ばれる
- [x] `onKeyUp` 短押しテスト
  - 操作前提: `punched = undefined` → 操作: 短押し（`onKeyDown` → `onKeyUp`）→ 期待結果: `setSettings({ punched: true })` + `setTitle("✅")` が呼ばれる
- [x] `onKeyDown` 長押しテスト（`vi.useFakeTimers()` 使用）
  - 操作前提: `punched = true` → 操作: 500ms 長押し → 期待結果: `setSettings({ punched: false })` + `setTitle("出勤")` が呼ばれる
  - 長押し後に `onKeyUp` が来ても短押しアクションが実行されないことを検証する

#### 3.2.2 退勤ボタン: `clock-out.test.ts`

- [x] 出勤テストと同一の観点で `"退勤"` ラベルを使用してテストする

### Phase 3.3: 最終検証

- [x] `bun run test` で全ユニットテスト pass を確認する（21/21 pass）
- [x] `bun run build` でビルド成功を確認する
- [x] **CHECKPOINT**: 全テスト pass、ビルド成功

**INTEGRATION-LATER**: KOT（KingOfTime）API との実際の打刻連携（API 呼び出し・エラーハンドリング・レスポンス待ち表示）
