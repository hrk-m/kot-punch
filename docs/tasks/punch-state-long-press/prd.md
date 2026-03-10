# PRD: 打刻ボタン長押し state 更新（punch-state-long-press）

## 1. Executive Summary

### Problem Statement

現行の `ClockIn` / `ClockOut` は `onKeyUp` だけで状態遷移を扱っており、`State 1` のとき短押しで即 `State 0` に戻る。手動で state を合わせたい場面では誤操作しやすく、短押しの打刻操作と state 変更操作も分離されていない。

### Proposed Solution

出勤・退勤ボタンの両方に 2 秒長押し判定を追加し、長押し時だけ `State 0 <-> State 1` を手動更新できるようにする。短押しは既存の打刻操作を維持し、`State 1` の短押しは no-op に変更する。

### Success Criteria

- `ClockIn` / `ClockOut` の両方で、押下開始から 2 秒到達時点で `State 0 <-> State 1` が即時切り替わる
- `State 0` の短押しは既存どおり打刻処理を実行し、成功時のみ `State 1` になる
- `State 1` の短押しでは state を変更せず、Puppeteer も起動しない
- 長押しによる手動 state 更新では `punchKot()` / `showOk()` / `notify()` を呼ばない
- 既存の `_isProcessing` による処理中ガードを維持し、長押し判定の追加で二重実行を生まない

---

## 2. User Experience & Functionality

### User Personas

- すでに KOT 打刻ボタンを日常利用しており、Stream Deck 上の見た目 state を手元で補正したいユーザー

### 合意済みボタンフロー

```text
Clock In / Clock Out 共通

[State 0]
- 短押し: 既存どおり打刻処理を実行し、成功時に State 1
- 2秒長押し: 打刻処理はせず、State 1 に手動更新

[State 1]
- 短押し: 何もしない
- 2秒長押し: State 0 に手動更新
```

### User Stories

| # | Story | Acceptance Criteria |
|---|-------|---------------------|
| 1 | ユーザーとして、未打刻状態では短押しで通常の打刻を実行したい | `State 0` で短押しすると `punchKot()` が呼ばれ、成功時にだけ `showOk()` と `setState(1)` が実行される |
| 2 | ユーザーとして、打刻を実行せずに見た目 state を手動で `State 1` に合わせたい | `State 0` で 2 秒到達まで押し続けると `setState(1)` のみ即時実行され、Puppeteer と通知は呼ばれない |
| 3 | ユーザーとして、打刻済み表示を誤タップで解除したくない | `State 1` の短押しでは何も起きず、2 秒到達まで押し続けたときだけ `setState(0)` が即時実行される |
| 4 | ユーザーとして、処理中に追加入力しても壊れないでほしい | 打刻処理中は `onKeyDown` / `onKeyUp` とも state 更新も打刻も開始せず、既存処理完了を待つ |

### 最外ボタン遷移仕様

| 遷移元 | 操作 | 遷移先 | 到達直後の状態 |
|--------|------|--------|----------------|
| Stream Deck 上の `Clock In` / `Clock Out` ボタン（State 0） | 短押し | 同一ボタン | 打刻処理中。成功で State 1、失敗で State 0 |
| Stream Deck 上の `Clock In` / `Clock Out` ボタン（State 0） | 2 秒到達まで長押し | 同一ボタン | 到達時点で即時に State 1 |
| Stream Deck 上の `Clock In` / `Clock Out` ボタン（State 1） | 短押し | 同一ボタン | State 1 のまま変化なし |
| Stream Deck 上の `Clock In` / `Clock Out` ボタン（State 1） | 2 秒到達まで長押し | 同一ボタン | 到達時点で即時に State 0 |
| Stream Deck 上の `Clock In` / `Clock Out` ボタン（処理中） | 短押し / 長押し | 同一ボタン | 無視。既存処理継続 |

### Non-Goals

- 長押し中のボタンタイトル変更、進捗表示、アニメーション
- `State` の永続化仕様変更（現状どおりセッション内のみ）
- `Open KOT` / `Open Request` への長押し追加
- Multi-Action 対応

---

## 3. AI System Requirements

該当なし。

---

## 4. Technical Specifications

### Architecture Overview

```text
src/actions/clock-in.ts
src/actions/clock-out.ts
  ├─ onKeyDown で 2 秒タイマーと long-press callback を登録
  ├─ 2 秒到達時点で state を即時手動更新
  ├─ onKeyUp で tracker を解放し、長押し成立済みなら no-op
  └─ 長押し未成立時だけ既存の短押しフローへ分岐

src/actions/__tests__/clock-in.test.ts
src/actions/__tests__/clock-out.test.ts
  └─ fake timer ベースで短押し / 長押し / 処理中ガードを回帰テスト
```

### Interaction Design

- 長押し閾値は `2000ms` 固定とする
- state 更新は押下開始から `2000ms` 到達時点で確定する
- 長押しによる手動更新は KOT へのアクセスを行わず、UI state だけを切り替える
- 短押しの打刻成功時だけ既存どおり `showOk()` と `notify()` を実行する

### Action-Level Behavior

#### Clock In / Clock Out 共通

1. `onKeyDown` で 2 秒タイマーを開始し、到達時点で `setState(0|1)` を呼ぶ long-press callback を登録する
2. `2000ms` 到達時点で現在の `ev.payload.state` を見て `setState(0|1)` を即時実行する
3. `onKeyUp` で tracker を解放し、長押し成立済みなら no-op で終了する
4. 長押し未成立かつ `State 0` なら既存の打刻処理へ進む
5. 長押し未成立かつ `State 1` なら no-op で終了する
6. `_isProcessing` が `true` の間は `onKeyDown` / `onKeyUp` のどちらでも新規操作を受け付けない

#### 既存ロジックからの変更点

| 現状 | 変更後 |
|------|--------|
| `State 1` の短押しで即 `setState(0)` | `State 1` の短押しは no-op、2 秒長押し時のみ `setState(0)` |
| `State 0` は短押しで打刻成功後に `setState(1)` | 維持。加えて 2 秒長押しで `setState(1)` を手動実行可能にする |
| `onKeyUp` のみで入力判定 | `onKeyDown` で long-press callback を登録し、`onKeyUp` では成立済みかどうかだけを確認する |

### Integration Points

| 依存先 | 用途 |
|--------|------|
| `@elgato/streamdeck` | `onKeyDown` / `onKeyUp` イベントで 2 秒タイマーの開始・解除と短押し分岐を扱う |
| `src/lib/puppeteer.ts` | 短押し `State 0` のみ `punchKot()` を呼ぶ |
| `src/lib/showErrorImage.ts` | 短押し打刻失敗時のみ既存どおりエラー表示 |
| `src/lib/notify.ts` | 短押し打刻成功時のみ既存どおり通知送信 |

### Testing Strategy

- `clock-in.test.ts` / `clock-out.test.ts` で `onKeyDown` を追加モックし、`vi.useFakeTimers()` で 1999ms と 2000ms の境界と即時 state 更新を検証する
- `State 0` 短押しで `punchKot()` が呼ばれ、長押しでは呼ばれないことを検証する
- `State 1` 短押しが no-op、長押しだけ `setState(0)` になることを検証する
- 長押し state 更新では `showOk()` / `notify()` / `showErrorImage()` が呼ばれないことを検証する
- `_isProcessing=true` の間に `onKeyDown` / `onKeyUp` を重ねても追加処理が発火しないことを検証する

### Security & Privacy

- 新しい設定値やシークレットは追加しない
- 長押し state 更新ではブラウザ起動や認証情報の利用を行わない

---

## 5. Risks & Roadmap

### Phased Rollout

- MVP: `ClockIn` / `ClockOut` に 2 秒長押し state 更新を追加し、既存短押し打刻を維持する
- v1.1: 必要になった場合のみ長押し中フィードバックや共通 helper 抽出を検討する

### Technical Risks

| リスク | 対策 |
|---|---|
| `onKeyDown` と `onKeyUp` の対応が崩れると誤判定する | タイマー開始・成立済み状態・`onKeyUp` での後始末をテストで固定する |
| 2000ms 境界の判定が不安定になる | fake timer で 1999ms / 2000ms の境界ケースと即時 callback 発火を明示的に回帰テストする |
| 手動 state 更新が打刻済みの事実とズレる | 本機能は UI state の手動補正であり、KOT 側の実打刻を変更しないことを PRD と spec に明記する |

---

## 6. Additional Requirement: 2秒到達時点での即時アイコン更新

### Confirmed Behavior

```text
Clock In / Clock Out 共通

[State 0]
1. ボタンを押した時
   - 2秒タイマーを開始する
   - この時点ではアイコンは変えない
   - 短押しか長押しかはまだ確定しない
2. 押したまま 2 秒経過した時
   - State 1 のアイコンに切り替える
   - この操作はここで完了とする
   - 以後、この押下に対して追加処理は行わない
3. 2 秒未満でボタンをはなした時
   - 短押しとして扱う
   - 既存どおり打刻処理を実行する
   - 打刻成功時のみ State 1 にする

[State 1]
1. ボタンを押した時
   - 2秒タイマーを開始する
   - この時点ではアイコンは変えない
   - 短押しか長押しかはまだ確定しない
2. 押したまま 2 秒経過した時
   - State 0 のアイコンに切り替える
   - この操作はここで完了とする
   - 以後、この押下に対して追加処理は行わない
3. 2 秒未満でボタンをはなした時
   - 短押しとして扱う
   - 何もしない
   - State 1 のまま維持する

[処理中]
1. ボタンを押した時
   - 何もしない
2. ボタンをはなした時
   - 何もしない
```

### Delta From Current Task Scope

- state 更新タイミングを `onKeyUp` 確定から「押下開始から 2 秒到達時点」へ変更する
- 長押し成立後はその押下を完了扱いとし、`onKeyUp` では追加処理を行わない
- 2 秒到達前は見た目変化なしのままとし、進捗表示・タイトル変更は入れない

### Additional Acceptance Criteria

- `onKeyDown` では 2 秒タイマー開始だけを行い、`2000ms` 到達前にアイコンやタイトルは変えない
- `State 0` / `State 1` のどちらでも、押下開始から `2000ms` 到達時点で `setState()` が即時呼ばれる
- 2 秒到達後も押し続けている間に重複して `setState()` が呼ばれない
- 長押し成立後は、その後にボタンをはなしても `punchKot()` / `showOk()` / `notify()` / 追加の `setState()` が発生しない
- `1999ms` で離した場合は長押し扱いにならず、`State 0` は既存の短押し打刻、`State 1` は no-op のまま動作する

### Additional Technical Notes

- `src/lib/long-press.ts` は「経過時間を返す helper」から、「2 秒タイマーの開始・解除・成立済み状態管理」を担う helper へ見直す
- `src/actions/clock-in.ts` / `src/actions/clock-out.ts` は `onKeyDown` 内で long-press callback を登録し、その callback の中で `setState()` を呼ぶ
- この追加要件の実装では、`onKeyUp` 確定から timer-based の即時反映へ責務を移し、release 側は短押し未成立時だけを扱う
