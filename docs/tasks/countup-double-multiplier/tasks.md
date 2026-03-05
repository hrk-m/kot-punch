# Tasks: Countup Double Multiplier

## 概要

`IncrementCounter` アクションの乗数を 5 倍から 2 倍に変更する。
長押しリセット・初期表示ロジックは変更しない。

---

## Phase 1: Impact and Change Analysis

### Phase 1.1: 関連実装を調査する

- [x] `src/actions/increment-counter.ts` の現在の実装を読む（`MULTIPLIER = 5` を確認）
- [x] `src/actions/__tests__/increment-counter.test.ts` の既存テスト構成を確認する

### Phase 1.2: 変更候補を特定する

- [x] 変更対象ファイルと変更理由を列挙する
  - `src/actions/increment-counter.ts`: `MULTIPLIER = 5` を `MULTIPLIER = 2` に変更
  - `src/actions/__tests__/increment-counter.test.ts`: 5 倍の期待値（5, 25）を 2 倍（2, 4）に更新し、describe 文も更新
- [x] 変更しないファイルを確認する: `manifest.json`、`plugin.ts`、`onKeyDown`（長押し検出）、`onWillAppear`
- [x] **CHECKPOINT**: 変更対象ファイルが `increment-counter.ts` と `increment-counter.test.ts` の 2 ファイルのみであることを確認

---

## Phase 2: Mock Empty-State Baseline

### Phase 2.1: モック契約を固定する（**MOCK-CONTRACT**）

- [x] **MOCK-CONTRACT**: `CounterSettings` 型に変更なし（`count?: number` のまま）
- [x] **MOCK-CONTRACT**: 長押しプロパティに変更なし（`_longPressTimer`, `_isLongPress` のまま）
- [x] **MOCK-CONTRACT**: 乗数定数の更新
  ```typescript
  const MULTIPLIER = 2;
  ```

### Phase 2.2: 実装更新で動作を成立させる（**MOCK-IMPL**）

- [x] **MOCK-IMPL**: `increment-counter.ts` の `MULTIPLIER = 5` を `MULTIPLIER = 2` に変更する
- [x] ビルドが通ることを確認する（`bun run build`）
- [x] **CHECKPOINT**: 型エラーゼロ、ビルド成功

---

## Phase 3: Progressive Fill-In from Critical Paths

### Phase 3.1: 穴埋め対象を優先度付けする

- [x] テスト更新対象を洗い出す
  1. (高) 短押し 5 倍テストケースの期待値を 2 倍に更新
  2. (高) describe 文の "5 倍" 表記を "2 倍" に更新
  3. (中) 長押し後のガード値（`count=15`）を 2 倍の値（`count=6`）に更新

### Phase 3.2: テストを 2 倍の期待値に更新する

#### 3.2.1 短押し: 2 倍カウントアップテスト

- [x] `count が 1 のとき、短押しで count を 5 にセットする` → `count を 2 にセットする` に更新する
  - 操作前提: `count = 1` → 期待結果: `count = 2`
- [x] `count が 5 のとき、短押しで count を 25 にセットする` → `count が 2 のとき、短押しで count を 4 にセットする` に更新する
  - 操作前提: `count = 2` → 期待結果: `count = 4`
- [x] describe 文 `"短押し: 5 倍カウントアップ"` を `"短押し: 2 倍カウントアップ"` に更新する

#### 3.2.2 長押しテストの期待値確認

- [x] 長押しリセットテスト（`count=1`）は変更不要であることを確認する
- [x] `長押しタイマー発火後に onKeyUp が来ても count は増加しない` のテストケース内の `count=15` 参照を `count=6` に更新する
  - 操作前提: `count=3` → 長押し発火 → `count=6` にはなっていないこと

### Phase 3.3: 最終検証

- [x] `bun run test` で全ユニットテスト pass を確認する（9/9 pass）
- [x] `bun run build` でビルド成功を確認する
- [x] **CHECKPOINT**: 全テスト pass、lint 0 errors、build 成功

**INTEGRATION-LATER**: Stream Deck 実機での動作確認（2 倍カウントの体感確認）
