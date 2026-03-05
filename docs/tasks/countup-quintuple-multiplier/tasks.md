# Tasks: Countup Quintuple Multiplier

## 概要

`IncrementCounter` アクションの乗数を 3 倍から 5 倍に変更する。
長押しリセット・初期表示ロジックは変更しない。

---

## Phase 1: Impact and Change Analysis

### Phase 1.1: 関連実装を調査する

- [x] `src/actions/increment-counter.ts` の現在の実装を読む（乗数 `current * 3` を確認）
- [x] `src/actions/__tests__/increment-counter.test.ts` の既存テスト構成を確認する

### Phase 1.2: 変更候補を特定する

- [x] 変更対象ファイルと変更理由を列挙する
  - `src/actions/increment-counter.ts`: `onKeyUp` 内の `current * 3` を `current * 5` に変更
  - `src/actions/__tests__/increment-counter.test.ts`: 3 倍の期待値（3, 27）を 5 倍（5, 125）に更新し、describe 文も更新
- [x] 変更しないファイルを確認する: `manifest.json`、`plugin.ts`、`onKeyDown`（長押し検出）、`onWillAppear`
- [x] **CHECKPOINT**: 変更対象ファイルが `increment-counter.ts` と `increment-counter.test.ts` の 2 ファイルのみであることを確認

---

## Phase 2: Mock Empty-State Baseline

### Phase 2.1: モック契約を固定する（**MOCK-CONTRACT**）

- [x] **MOCK-CONTRACT**: `CounterSettings` 型に変更なし（`count?: number` のまま）
- [x] **MOCK-CONTRACT**: 長押しプロパティに変更なし（`_longPressTimer`, `_isLongPress` のまま）
- [x] **MOCK-CONTRACT**: 乗数を定数化する（マジックナンバー排除）
  ```typescript
  const MULTIPLIER = 5;
  ```

### Phase 2.2: 実装更新で動作を成立させる（**MOCK-IMPL**）

- [x] **MOCK-IMPL**: `increment-counter.ts` の `onKeyUp` 内 `current * 3` を `current * 5` に変更する
- [x] ビルドが通ることを確認する（`bun run build`）
- [x] **CHECKPOINT**: 型エラーゼロ、ビルド成功

---

## Phase 3: Progressive Fill-In from Critical Paths

### Phase 3.1: 穴埋め対象を優先度付けする

- [x] テスト更新対象を洗い出す
  1. (高) 短押し 3 倍テストケースの期待値を 5 倍に更新
  2. (高) describe 文の "3 倍" 表記を "5 倍" に更新

### Phase 3.2: テストを 5 倍の期待値に更新する

#### 3.2.1 短押し: 5 倍カウントアップテスト

- [x] `count が 1 のとき、短押しで count を 3 にセットする` → `count を 5 にセットする` に更新する
  - 操作前提: `count = 1` → 期待結果: `count = 5`
- [x] `count が 9 のとき、短押しで count を 27 にセットする` → `count が 5 のとき、短押しで count を 25 にセットする` に更新する
  - 操作前提: `count = 5` → 期待結果: `count = 25`
- [x] describe 文 `"短押し: 3 倍カウントアップ"` を `"短押し: 5 倍カウントアップ"` に更新する

#### 3.2.2 長押しテストの期待値確認

- [x] 長押しリセットテスト（`count=1`）は変更不要であることを確認する
- [x] `長押しタイマー発火後に onKeyUp が来ても count は増加しない` のテストケース内の `count=9` 参照を `count=15` に更新する
  - 操作前提: `count=3` → 長押し発火 → `count=15` にはなっていないこと

### Phase 3.3: 最終検証

- [x] `bun run test` で全ユニットテスト pass を確認する（9/9 pass）
- [x] `bun run build` でビルド成功を確認する
- [x] **CHECKPOINT**: 全テスト pass、lint 0 errors、build 成功

**INTEGRATION-LATER**: Stream Deck 実機での動作確認（5 倍カウントの体感確認）
