# Spec: 打刻ボタン（Clock In / Clock Out）

## 概要

Stream Deck のボタンを押すだけで出勤・退勤打刻を実行するアクション群。Puppeteer で KOT 打刻ページを自動操作し、ワンボタンで打刻を完結させる。

---

## 前提条件

- グローバル設定に `kotPunchUrl` / `kotPunchKey` / `kotPunchToken` / `kotPunchUsername` / `kotPunchPassword` が設定済みであること
- Stream Deck プラグインが起動していること

---

## 入力・出力

| 項目 | 型 | 説明 |
|------|----|------|
| 入力: `onKeyUp` イベント | `KeyUpEvent` | Stream Deck のキー離し操作 |
| 入力: グローバル設定 | `KotPunchSettings` | `kotPunchUrl` / `kotPunchKey` / `kotPunchToken` / `kotPunchUsername` / `kotPunchPassword` / `kotPunchDryRun` |
| 出力 | `void` | 副作用として打刻を実行し、UI 状態を更新する |

---

## 主フロー（正常系）

```
ボタン押下（onKeyUp）
  │
  ├─ 処理中フラグチェック → 処理中なら即 return
  ├─ State チェック → State 1 なら State 0 にリセットして return
  ├─ グローバル設定取得
  ├─ 必須項目チェック → 未入力なら showAlert()
  │
  └─ Puppeteer 起動
       ├─ JWT クッキーをセット
       ├─ 打刻ページに遷移
       ├─ ユーザー選択・パスワード入力
       ├─ kotPunchDryRun でなければ submit
       └─ 成功: showOk() + setState(1)
```

---

## 異常系・エラー処理

| エラー条件 | 対応 |
|---|---|
| 必須設定が未入力 | `showAlert()` を表示して処理を中断 |
| 認証失敗（ダイアログ検出） | ブラウザを閉じてエラーを throw → `showErrorImage()` + `setState(0)` |
| Puppeteer 操作エラー | `showErrorImage()` でエラー画像を 3 秒表示後 `setState(0)` にリセット |

---

## 状態遷移

| 状態 | 説明 | 遷移条件 |
|------|------|---------|
| State 0 | 未打刻（通常アイコン） | 初期状態 / エラー後リセット / State 1 でのボタン押下 |
| State 1 | 打刻済み（チェックマークアイコン） | 打刻成功後（`showOk()` + `setState(1)`） |

---

## 制約・非機能要件

- 連打防止: `_isProcessing` フラグで処理中の重複実行を防ぐ
- dryRun モード: `kotPunchDryRun=true` の場合は submit をスキップし、パスワード入力まで確認できる状態でブラウザを切断する
- State はセッション内のみ保持（プラグイン再起動でリセット）、当日限りの打刻管理として意図的に非永続化

---

## エッジケース・境界条件

| ケース | 挙動 |
|--------|------|
| State 1 でボタンを押した場合 | `setState(0)` にリセットして処理を抜ける（再打刻なし） |
| 処理中に再度ボタンを押した場合 | `_isProcessing` フラグにより即 `return` |
| `kotPunchDryRun=true` で実行した場合 | submit をスキップし、ブラウザを `disconnect()` のみで終了 |

---

## 依存関係

| 依存先 | 用途 |
|--------|------|
| `lib/puppeteer.ts` | `punchKot(selector, settings)` — Puppeteer 起動・打刻操作 |
| `lib/settings.ts` | `getGlobalSettings()` / `hasRequiredPunchSettings()` — 設定取得・バリデーション |
| `lib/showErrorImage.ts` | `showErrorImage(action)` — エラー画像表示ユーティリティ |
| KING OF TIME（外部） | 打刻対象のウェブサービス |
