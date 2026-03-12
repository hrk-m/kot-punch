# Spec: リセット（Reset Punch State）

## 概要

出勤・退勤の打刻済み状態を一括で未打刻にリセットするアクション。Stream Deck 上の Clock In / Clock Out ボタンの State を 0 に戻し、実際の打刻操作なしで UI の見た目を揃える。

---

## 前提条件

- Stream Deck プラグインが起動していること
- グローバル設定は不要（KOT への通信を行わない）

---

## 入力・出力

| 項目 | 型 | 説明 |
|------|----|------|
| 入力: `onKeyUp` イベント | `KeyUpEvent<Record<string, never>>` | Stream Deck のキー離し操作 |
| 出力 | `void` | 副作用として Clock In / Clock Out アクションの State を 0 にリセットする |

---

## 主フロー（正常系）

```
ボタン押下（onKeyUp）
  │
  └─ 登録済みアクションをスキャン
       ├─ `com.hrk-m.kot-punch.clock-in` / `clock-out` かつ isKey() なものを抽出
       ├─ 各アクションに setState(0) を並列実行
       └─ notify("打刻状態(出勤/退勤)をリセットしました")
```

---

## 異常系・エラー処理

| エラー条件 | 対応 |
|---|---|
| `setState(0)` 失敗 | エラーをキャッチしてログ出力のみ（他アクションのリセットは継続、UI 通知なし） |

---

## 制約・非機能要件

- 設定不要: グローバル設定・必須項目チェックは行わない
- KOT への通信なし: Puppeteer は起動しない
- 対象 UUID 固定: `clock-in` / `clock-out` のみリセット対象。他アクション（`open-kot` 等）は対象外
- isKey() フィルタ: ダイアル・タッチスクリーン等の非 Keypad アクションは除外する

---

## エッジケース・境界条件

| ケース | 挙動 |
|--------|------|
| Clock In / Clock Out がデッキに配置されていない場合 | スキャン結果が空になり、通知のみ送信して正常終了 |
| 一部の setState(0) が失敗した場合 | 失敗した分はログに記録し、残りは継続実行する |

---

## ボタン・アイコン一覧

この機能でユーザーが押すボタンと、対応する action/state を示す。

| ボタン | 状態 | アイコン | パス | 説明 |
|--------|------|----------|------|------|
| `リセット` | 通常（唯一の State） | <img src="../../com.hrk-m.kot-punch.sdPlugin/imgs/actions/reset-punch-state/key.png" width="72" height="72" alt="Reset Punch State button"> | `../../com.hrk-m.kot-punch.sdPlugin/imgs/actions/reset-punch-state/key.png` | 出勤・退勤の打刻状態を State 0（未打刻）に一括リセットするボタン |

---

## 依存関係

| 依存先 | 用途 |
|--------|------|
| `@elgato/streamdeck` | `streamDeck.actions` — 全登録アクションのイテレータ |
| `platform/streamdeck/logger.ts` | `logger.resetPunchState` — ログ出力 |
| `platform/desktop/notify.ts` | `notify(message)` — 完了時の macOS 通知（fire-and-forget） |
