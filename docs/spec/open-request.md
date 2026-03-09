# Spec: Open Request（申請画面を開く）

## 概要

申請画面にログイン済みの Chrome ウィンドウを開くアクション。Puppeteer でログインフォームに自動入力してブラウザをユーザーに引き渡し、ワンボタンで申請画面へのアクセスを完結させる。

---

## 前提条件

- グローバル設定に `requestUrl` / `requestUsername` / `requestPassword` が設定済みであること
- Stream Deck プラグインが起動していること

---

## 入力・出力

| 項目 | 型 | 説明 |
|------|----|------|
| 入力: `onKeyUp` イベント | `KeyUpEvent` | Stream Deck のキー離し操作 |
| 入力: グローバル設定 | `RequestSettings` | `requestUrl` / `requestUsername` / `requestPassword` |
| 出力 | `void` | 副作用としてログイン済み Chrome ウィンドウを開く |

---

## 主フロー（正常系）

```
ボタン押下（onKeyUp）
  │
  ├─ 処理中フラグチェック → 処理中なら即 return
  ├─ グローバル設定取得（getRequestSettings）
  ├─ 必須項目チェック → 未入力なら showAlert()
  │
  └─ Puppeteer 起動
       ├─ requestUrl へアクセス
       ├─ #login_id にユーザー名を入力
       ├─ #login_password にパスワードを入力
       ├─ #login_button クリック + 遷移待ち（networkidle0）
       ├─ disconnect()（ブラウザはそのまま引き渡す）
       └─ notify("申請画面を開きました")
```

---

## 異常系・エラー処理

| エラー条件 | 対応 |
|---|---|
| 必須設定が未入力 | `showAlert()` を表示して処理を中断 |
| ログイン失敗・ナビゲーションタイムアウト | `browser.close()` でクリーンアップ → `showErrorImage()` でエラー表示 |
| Puppeteer 起動・操作エラー | `showErrorImage()` でエラー表示 |

---

## 制約・非機能要件

- 連打防止: `_isProcessing` フラグで処理中の重複実行を防ぐ
- `disconnect()` のみ実行し `close()` は呼ばない（ブラウザをユーザーに引き渡す）
- 状態（State）管理は行わない（押下ごとにブラウザを開くだけ）

---

## エッジケース・境界条件

| ケース | 挙動 |
|--------|------|
| 処理中に再度ボタンを押した場合 | `_isProcessing` フラグにより即 `return` |
| ログインフォームへのナビゲーション失敗 | `catch` ブロックで `browser.close()` → `showErrorImage()` |

---

## 依存関係

| 依存先 | 用途 |
|--------|------|
| `lib/puppeteer.ts` | `openRequestPage(settings)` — Puppeteer 起動・ログイン・disconnect |
| `lib/settings.ts` | `getRequestSettings()` / `hasRequiredRequestSettings()` — 設定取得・バリデーション |
| `lib/showErrorImage.ts` | `showErrorImage(action)` — エラー画像表示ユーティリティ |
| `lib/notify.ts` | `notify(message)` — 成功時の macOS 通知（fire-and-forget） |
| 申請画面（外部） | ログイン対象のウェブサービス |
