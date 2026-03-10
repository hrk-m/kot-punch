# Tasks: 打刻ボタン長押し state 更新（punch-state-long-press）

> 合意済み事項
>
> - ボタン設定は PRD のまま維持する
> - `State 0` 短押しは既存どおり打刻する
> - `State 1` 短押しは no-op にする
> - 3 秒長押しで `State 0 <-> State 1` を手動更新する
> - 長押し判定は `ClockIn` / `ClockOut` で共通 helper にまとめる
> - Phase 2 のモック範囲は UI 追加なし、Vitest の fake timer と action/event モックに限定する

---

## Phase 1: Impact and Change Analysis

### Phase 1.1: 関連実装とイベント制約を調査する

- [ ] `src/actions/clock-in.ts` と `src/actions/clock-out.ts` を読み、現行の `_isProcessing` ガード、`State 1` 短押し解除、成功時 `showOk()` / `notify()` の位置を整理する
- [ ] `src/actions/__tests__/clock-in.test.ts` と `src/actions/__tests__/clock-out.test.ts` を読み、既存モック形状と回帰テスト観点を洗い出す
- [ ] `node_modules/@elgato/streamdeck/dist/plugin/actions/singleton-action.d.ts` を参照し、`onKeyDown` / `onKeyUp` の両方が Keypad action で利用できることを確認する
- [ ]* `docs/spec/punch.md` と `docs/architecture.md` を再確認し、打刻ボタンの state 仕様とテスト戦略の記述差分を把握する

### Phase 1.2: 変更候補と共通化方針を特定する

- [ ] 以下の変更候補ファイルを列挙し、変更理由を確定する

| ファイル | 変更種別 | 変更理由 |
|---|---|---|
| `src/actions/clock-in.ts` | 変更 | `onKeyDown` 追加、短押し/長押し分岐、`State 1` 短押し no-op 化 |
| `src/actions/clock-out.ts` | 変更 | `ClockIn` と同じ長押し仕様を適用 |
| `src/lib/long-press.ts` | 新規作成 | 押下開始記録と 3000ms 判定を共通 helper 化する |
| `src/lib/__tests__/long-press.test.ts` | 新規作成 | 長押し判定 helper の境界値と後始末を固定する |
| `src/actions/__tests__/clock-in.test.ts` | 変更 | 短押し/長押し/処理中ガードの回帰テストを追加する |
| `src/actions/__tests__/clock-out.test.ts` | 変更 | `ClockIn` と同等の回帰テストを追加する |
| `docs/spec/punch.md` | 変更 | `State 1` 短押し解除から 3 秒長押し手動更新仕様へ docs を同期する |

- [ ] 再利用候補を整理する
  - `ClockIn` / `ClockOut` の押下開始時刻管理
  - `3000ms` 境界判定
  - `onKeyUp` での「長押しかどうか」の判定 API
- [ ] 共通化方針として `src/lib/long-press.ts` に helper を作成し、両 action から使う前提を task 全体に反映する
- [ ] **CHECKPOINT**: 変更対象ファイル、イベント利用方針、helper 共通化方針が明確

---

## Phase 2: Mock Empty-State Baseline

> 確認済みモック範囲: 新しい UI 画面は作らず、Vitest の fake timer と action/event モックだけで短押し・長押し・処理中ガード・境界値を成立させる。

### Phase 2.1: モック契約を固定する

- [ ] **MOCK-CONTRACT** `src/lib/long-press.ts` の公開 API を定義する

```typescript
export type PressTracker = {
    begin(context: string, now?: number): void;
    end(context: string, now?: number): number | undefined;
    clear(context: string): void;
};

export function createPressTracker(): PressTracker;
export function isLongPress(durationMs: number, thresholdMs?: number): boolean;
export const LONG_PRESS_THRESHOLD_MS = 3000;
```

- [ ] **MOCK-CONTRACT** action テストで使うイベント shape を固定する

```typescript
type MockKeyEvent = {
    action: {
        setState: Mock;
        showOk: Mock;
        showAlert: Mock;
    };
    payload: {
        state: 0 | 1;
    };
    context: string;
};
```

- [ ] 3000ms 未満は短押し、3000ms 以上は長押しとして扱う境界条件をテスト観点に固定する
- [ ] **CHECKPOINT**: helper API と action event モック shape が確定

### Phase 2.2: 空モックで長押し判定を成立させる

- [ ] **MOCK-IMPL** `src/lib/__tests__/long-press.test.ts` を追加し、実時間に依存せず `now` 注入または fake timer で helper の契約を成立させる
- [ ] `clock-in.test.ts` と `clock-out.test.ts` の Stream Deck モックに `onKeyDown` を追加し、`context` 付きイベントを組み立てられるようにする
- [ ] `vi.useFakeTimers()` を使って `2999ms` と `3000ms` の押下継続時間を再現し、短押し/長押しの分岐だけを先にテストで表現する
- [ ] 長押し state 更新では `punchKot()` / `showOk()` / `notify()` / `showErrorImage()` が呼ばれない空モック状態を確認する
- [ ] **CHECKPOINT**: 実ブラウザ起動なしで長押し判定と主要 state 遷移が end-to-end で再現可能

---

## Phase 3: Progressive Fill-In from Critical Paths

### Phase 3.1: 穴埋め対象を優先度付けする

- [ ] Phase 2 で作成したモック実装箇所を洗い出し、以下の優先順位を確認する

| 優先度 | 対象 | 理由 |
|---|---|---|
| 高 | `State 1` 短押しを no-op に変更する | 誤操作防止の中核仕様 |
| 高 | 3 秒長押しで `State 0 <-> State 1` を切り替える | 新機能の本体 |
| 高 | `_isProcessing` 中の `onKeyDown` / `onKeyUp` を無視する | 二重実行や誤 state 更新を防ぐ |
| 中 | 共通 helper で context ごとの押下開始時刻を管理する | `ClockIn` / `ClockOut` の重複防止 |
| 中 | `docs/spec/punch.md` を新仕様へ更新する | 実装と docs の同期維持 |

- [ ] `ClockIn` / `ClockOut` の両 action で同一ユースケースを満たすことを確認し、片方だけに残る分岐を作らない

### Phase 3.2: 共通 helper を実装する

- [ ] `src/lib/long-press.ts` を新規作成し、action `context` 単位で押下開始時刻を保持・解放できる helper を実装する
- [ ] `src/lib/__tests__/long-press.test.ts` に以下の回帰テストを追加する
  - `begin()` 後に `end()` すると経過時間を返す
  - `begin()` されていない `context` の `end()` は `undefined` を返す
  - `3000ms` ちょうどで `isLongPress()` が `true` を返す
  - `2999ms` では `false` を返す
  - `clear()` 後は以前の押下状態を再利用しない
- [ ] helper が action の `showOk()` や `punchKot()` に依存しない純粋ロジックであることを確認する

### Phase 3.3: Clock In / Clock Out に短押し・長押し分岐を実装する

- [ ] `src/actions/clock-in.ts` に `onKeyDown` を追加し、押下開始時刻を helper に記録する
  - 操作前提: `ClockIn` ボタンが表示中で `_isProcessing=false`
  - 操作: キーを押し込む
  - 期待結果: まだ state は変えず、押下開始だけを記録する
- [ ] `src/actions/clock-in.ts` の `onKeyUp` を更新し、短押し/長押しで以下のように分岐させる
  - 操作前提: `State 0` + 短押し
  - 操作: キーを離す
  - 期待結果: `punchKot("#attend", settings)` を呼び、成功時だけ `showOk()` + `setState(1)` + `notify()`
  - 操作前提: `State 0` + 3 秒長押し
  - 操作: キーを離す
  - 期待結果: `setState(1)` のみ実行し、打刻処理と通知は呼ばない
  - 操作前提: `State 1` + 短押し
  - 操作: キーを離す
  - 期待結果: no-op で終了する
  - 操作前提: `State 1` + 3 秒長押し
  - 操作: キーを離す
  - 期待結果: `setState(0)` のみ実行する
- [ ] `src/actions/clock-out.ts` にも同じ分岐を適用し、打刻セレクタだけ `#leave` に差し替える
- [ ] `_isProcessing=true` の間は `onKeyDown` / `onKeyUp` の両方で早期 return し、押下開始状態も残さないよう後始末を入れる

### Phase 3.4: Action テストと docs を更新する

- [ ] `src/actions/__tests__/clock-in.test.ts` に以下の回帰テストを追加・更新する
  - `State 0` 短押しで `punchKot("#attend", fullSettings)` が呼ばれる
  - `State 0` 長押しで `setState(1)` のみ呼ばれる
  - `State 1` 短押しで no-op になる
  - `State 1` 長押しで `setState(0)` のみ呼ばれる
  - `_isProcessing=true` 中は `onKeyDown` / `onKeyUp` の追加入力が無視される
- [ ] `src/actions/__tests__/clock-out.test.ts` に同等の回帰テストを追加し、`#leave` セレクタのまま動作することを確認する
- [ ] `docs/spec/punch.md` を更新し、短押し/長押しの新 state 遷移と no-op 動作を反映する
- [ ] `bun run lint && bun run test && bunx tsc --noEmit && bun run build` を実行し、回帰がないことを確認する
- [ ] **CHECKPOINT**: 主要ユースケースが helper 共通化込みで再現され、docs と実装が一致する

---

## **INTEGRATION-LATER**

- 長押し中の視覚フィードバック（タイトル変更、進捗表示、アニメーション）
- `State` の永続化仕様変更
- `Open KOT` / `Open Request` への長押し拡張
- 実機 Stream Deck 上での長押し体感差異に応じた閾値調整 UI
