# Spec: Open KOT（KOT を開く）

## 概要

JWT 認証済みの Chrome ウィンドウで KING OF TIME 勤怠画面を開くアクション。`kotPunchUrl` に指定した画面へ遷移し、ブラウザを閉じずに切断するため、そのまま手動操作を続けられる。

---

## 前提条件

- グローバル設定に `kotPunchUrl` / `kotPunchKey` / `kotPunchToken` が設定済みであること
- Stream Deck プラグインが起動していること

---

## 入力・出力

| 項目 | 型 | 説明 |
|------|----|------|
| 入力: `onKeyUp` イベント | `KeyUpEvent` | Stream Deck のキー離し操作 |
| 入力: グローバル設定 | `KotPunchSettings` | `kotPunchUrl` / `kotPunchKey` / `kotPunchToken` |
| 出力 | `void` | 副作用として JWT 認証済み Chrome ウィンドウを開く |

---

## 主フロー（正常系）

```
ボタン押下（onKeyUp）
  │
  ├─ 処理中フラグチェック → 処理中なら即 return
  ├─ グローバル設定取得
  ├─ 必須項目チェック → 未入力なら showAlert()
  │
  └─ Puppeteer 起動
       ├─ kotPunchUrl へアクセス（domain 確立）
       ├─ JWT クッキーをセット
       ├─ 再アクセスして認証適用
       ├─ disconnect()（ブラウザは閉じない）
       └─ notify("KING OF TIME を開きました")
```

---

## 異常系・エラー処理

| エラー条件 | 対応 |
|---|---|
| 必須設定が未入力 | `showAlert()` を表示して処理を中断 |
| 認証失敗（ダイアログ検出） | ブラウザを閉じてエラーを throw → `showErrorImage()` でエラー表示 |
| Puppeteer 起動・操作エラー | `showErrorImage()` でエラー表示 |

---

## 制約・非機能要件

- 連打防止: `_isProcessing` フラグで処理中の重複実行を防ぐ
- `disconnect()` のみ実行し `close()` は呼ばない（ブラウザをユーザーに引き渡す）
- 状態（State）管理は行わない。押下ごとに認証済みブラウザを新しく開く

---

## エッジケース・境界条件

| ケース | 挙動 |
|--------|------|
| 処理中に再度ボタンを押した場合 | `_isProcessing` フラグにより即 `return` |
| 認証ダイアログが表示された場合 | ダイアログを dismiss してブラウザを閉じ、エラーを throw |

---

## 依存関係

| 依存先 | 用途 |
|--------|------|
| `lib/puppeteer.ts` | `openKotPage(settings)` — Puppeteer 起動・JWT 認証・disconnect |
| `lib/settings.ts` | `getGlobalSettings()` / `hasRequiredSettings()` — 設定取得・バリデーション |
| `lib/showErrorImage.ts` | `showErrorImage(action)` — エラー画像表示ユーティリティ |
| `lib/notify.ts` | `notify(message)` — 成功時の macOS 通知（fire-and-forget） |
| KING OF TIME（外部） | 表示対象のウェブサービス |
