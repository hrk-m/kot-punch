# PRD: 打刻ボタン長押し state 更新（punch-state-long-press）

## 1. Executive Summary

### Problem Statement

現行の `ClockIn` / `ClockOut` は `onKeyUp` だけで状態遷移を扱っており、`State 1` のとき短押しで即 `State 0` に戻る。手動で state を合わせたい場面では誤操作しやすく、短押しの打刻操作と state 変更操作も分離されていない。

### Proposed Solution

出勤・退勤ボタンの両方に 2 秒長押し判定を追加し、長押し時だけ `State 0 <-> State 1` を手動更新できるようにする。短押しは既存の打刻操作を維持し、`State 1` の短押しは no-op に変更する。

### Success Criteria

- `ClockIn` / `ClockOut` の両方で、2 秒以上の長押し後にキーを離すと `State 0 <-> State 1` が切り替わる
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
| 2 | ユーザーとして、打刻を実行せずに見た目 state を手動で `State 1` に合わせたい | `State 0` で 2 秒以上長押しして離すと `setState(1)` のみ実行され、Puppeteer と通知は呼ばれない |
| 3 | ユーザーとして、打刻済み表示を誤タップで解除したくない | `State 1` の短押しでは何も起きず、2 秒以上長押しして離したときだけ `setState(0)` が実行される |
| 4 | ユーザーとして、処理中に追加入力しても壊れないでほしい | 打刻処理中は `onKeyDown` / `onKeyUp` とも state 更新も打刻も開始せず、既存処理完了を待つ |

### 最外ボタン遷移仕様

| 遷移元 | 操作 | 遷移先 | 到達直後の状態 |
|--------|------|--------|----------------|
| Stream Deck 上の `Clock In` / `Clock Out` ボタン（State 0） | 短押し | 同一ボタン | 打刻処理中。成功で State 1、失敗で State 0 |
| Stream Deck 上の `Clock In` / `Clock Out` ボタン（State 0） | 2 秒長押しして離す | 同一ボタン | 即時に State 1 |
| Stream Deck 上の `Clock In` / `Clock Out` ボタン（State 1） | 短押し | 同一ボタン | State 1 のまま変化なし |
| Stream Deck 上の `Clock In` / `Clock Out` ボタン（State 1） | 2 秒長押しして離す | 同一ボタン | 即時に State 0 |
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
  ├─ onKeyDown を追加し、押下開始時刻または長押しタイマーを保持
  ├─ onKeyUp で押下時間を評価
  ├─ 2秒以上なら state のみ手動更新
  └─ 2秒未満なら既存の短押しフローへ分岐

src/actions/__tests__/clock-in.test.ts
src/actions/__tests__/clock-out.test.ts
  └─ fake timer ベースで短押し / 長押し / 処理中ガードを回帰テスト
```

### Interaction Design

- 長押し閾値は `2000ms` 固定とする
- state 更新は押下中ではなく、`onKeyUp` 時点で押下継続時間を評価して確定する
- 長押しによる手動更新は KOT へのアクセスを行わず、UI state だけを切り替える
- 短押しの打刻成功時だけ既存どおり `showOk()` と `notify()` を実行する

### Action-Level Behavior

#### Clock In / Clock Out 共通

1. `onKeyDown` で押下開始時刻を記録する
2. `onKeyUp` で押下時間を算出する
3. 押下時間が `2000ms` 以上なら現在の `ev.payload.state` を見て `setState(0|1)` を実行して終了する
4. 押下時間が `2000ms` 未満かつ `State 0` なら既存の打刻処理へ進む
5. 押下時間が `2000ms` 未満かつ `State 1` なら no-op で終了する
6. `_isProcessing` が `true` の間は `onKeyDown` / `onKeyUp` のどちらでも新規操作を受け付けない

#### 既存ロジックからの変更点

| 現状 | 変更後 |
|------|--------|
| `State 1` の短押しで即 `setState(0)` | `State 1` の短押しは no-op、2 秒長押し時のみ `setState(0)` |
| `State 0` は短押しで打刻成功後に `setState(1)` | 維持。加えて 2 秒長押しで `setState(1)` を手動実行可能にする |
| `onKeyUp` のみで入力判定 | `onKeyDown` + `onKeyUp` の組み合わせで押下時間を判定 |

### Integration Points

| 依存先 | 用途 |
|--------|------|
| `@elgato/streamdeck` | `onKeyDown` / `onKeyUp` イベントで押下継続時間を判定する |
| `src/lib/puppeteer.ts` | 短押し `State 0` のみ `punchKot()` を呼ぶ |
| `src/lib/showErrorImage.ts` | 短押し打刻失敗時のみ既存どおりエラー表示 |
| `src/lib/notify.ts` | 短押し打刻成功時のみ既存どおり通知送信 |

### Testing Strategy

- `clock-in.test.ts` / `clock-out.test.ts` で `onKeyDown` を追加モックし、`vi.useFakeTimers()` で 1999ms と 2000ms の境界を検証する
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
| `onKeyDown` と `onKeyUp` の対応が崩れると誤判定する | 押下開始時刻の初期化と `finally` / no-op パスでの後始末をテストで固定する |
| 2000ms 境界の判定が不安定になる | fake timer で 1999ms / 2000ms の境界ケースを明示的に回帰テストする |
| 手動 state 更新が打刻済みの事実とズレる | 本機能は UI state の手動補正であり、KOT 側の実打刻を変更しないことを PRD と spec に明記する |
