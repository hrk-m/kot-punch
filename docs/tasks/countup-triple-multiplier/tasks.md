# Tasks: Countup Triple Multiplier

## 概要

`IncrementCounter` アクションを改修し、短押しで 3 倍カウントアップ・長押しでリセット（count=1）を実現する。

---

## Phase 1: Impact and Change Analysis

### Phase 1.1: 関連実装を調査する

- [x] `src/actions/increment-counter.ts` の現在の実装を読む
- [x] `src/actions/__tests__/increment-counter.test.ts` の既存テスト構成を確認する
- [ ]* `@elgato/streamdeck` SDK の `onKeyDown` / `onKeyUp` イベントの型シグネチャを確認する

### Phase 1.2: 変更候補を特定する

- [x] 変更対象ファイルと変更理由を列挙する
  - `src/actions/increment-counter.ts`: 3 倍ロジック追加 + 長押し検出タイマー追加 + `onKeyUp` ハンドラ追加
  - `src/actions/__tests__/increment-counter.test.ts`: 新挙動のテストケース追加 + 旧テストケースの更新
- [x] `CounterSettings` 型の `incrementBy` フィールドが削除対象かを確認する（新ロジックでは不使用 → 削除済み）
- [x] **CHECKPOINT**: 変更対象ファイルが `increment-counter.ts` と `increment-counter.test.ts` の 2 ファイルであることを確認

---

## Phase 2: Mock Empty-State Baseline

### Phase 2.1: モック契約を固定する（**MOCK-CONTRACT**）

- [x] **MOCK-CONTRACT**: `CounterSettings` 型を以下に更新する
  ```typescript
  type CounterSettings = {
    count?: number;
  };
  ```
- [x] **MOCK-CONTRACT**: 長押し管理用のプライベートプロパティ型を決定する
  ```typescript
  private _longPressTimer: ReturnType<typeof setTimeout> | undefined;
  private _isLongPress = false;
  ```
- [x] **MOCK-CONTRACT**: `onKeyUp` イベントハンドラのシグネチャを確認する（`KeyUpEvent<CounterSettings>` 型）

### Phase 2.2: 空スケルトンで全体を成立させる（**MOCK-IMPL**）

- [x] **MOCK-IMPL**: `onWillAppear` を `count ?? 1` 表示に更新する
- [x] **MOCK-IMPL**: `onKeyDown` にタイマー起動ロジックを実装する
- [x] **MOCK-IMPL**: `onKeyUp` ハンドラを追加する
- [x] テスト側のモックに `onKeyUp` スタブを追加する
- [x] **CHECKPOINT**: ビルドが通り、型エラーがゼロ（`bun run build` pass）

---

## Phase 3: Progressive Fill-In from Critical Paths

### Phase 3.1: 穴埋め対象を優先度付けする

- [x] Phase 2 で空にした処理を洗い出す
  1. (高) 短押し: 3 倍カウントアップロジック
  2. (高) 長押し: 500ms タイマー + リセット処理
  3. (中) 短押し判定: 長押し中は count 増加を実行しない制御

### Phase 3.2: 重要処理から穴埋めする

#### 3.2.1 短押し: 3 倍カウントアップ

- [x] `onKeyUp` に短押し用の 3 倍ロジックを実装する
  - 操作前提: `count = 0`（初期）→ 期待結果: `count = 1`
  - 操作前提: `count = 1` → 期待結果: `count = 3`
  - 操作前提: `count = 9` → 期待結果: `count = 27`
- [x] 対応するユニットテストを追加・全 pass 確認

#### 3.2.2 長押し: リセット

- [x] `onKeyDown` に 500ms タイマーを実装する
- [x] `onKeyUp` にタイマーキャンセル処理を実装する
- [x] リセット処理: `count = 1`、`setSettings`、`setTitle("1")` を実行
- [x] 対応するユニットテストを追加・全 pass 確認

#### 3.2.3 短押し中の長押し無効化

- [x] 長押しタイマーが発火した場合、`onKeyUp` でカウントアップを実行しないフラグ制御を実装
- [x] 対応するユニットテストを追加・全 pass 確認

### Phase 3.3: 既存テストの更新と最終検証

- [x] 既存テストで `incrementBy` に依存しているテストケースを削除
- [x] `onWillAppear` で `count` 未設定時に `"1"` が表示されることを確認するテストを更新
- [x] `bun run build` でビルドが通ることを確認
- [x] **CHECKPOINT**: 全ユニットテスト 9/9 pass、lint 0 errors、build 成功

**INTEGRATION-LATER**: Stream Deck 実機での動作確認（長押し閾値の体感調整、実機デバッグ）
