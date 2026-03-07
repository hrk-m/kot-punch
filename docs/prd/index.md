# PRD: KOT Punch

## 概要

KingOfTime (KOT) 向け Elgato Stream Deck プラグイン。Stream Deck のボタンから直接 KOT の勤怠操作（打刻など）を行うことを目的とする。

- **対象ユーザー**: KOT を使用し、Stream Deck を所持する開発者・業務従事者
- **提供価値**: 勤怠打刻をワンボタン化することによる操作コストの削減

---

## コア機能

### 実装済み

#### 勤怠画面を開くボタン（`com.hrk-m.kot-punch.open-kot`）

- ボタン押下（`onKeyUp`）：JWT クッキーをセット済みの Chrome ウィンドウで KOT 勤怠画面を開く
- 設定未完了（`kingOfTimeUrl` / `tokenKey` / `token` のいずれかが空）：`showAlert()` で Property Inspector へ誘導
- 認証失敗（遷移後にダイアログ検出）：ブラウザを閉じてエラーをスロー
- エラー発生：`showErrorImage()` でエラー画像を 3 秒表示（フォールバック: `showAlert()`）
- 連打防止：`_isProcessing` フラグで `onKeyUp` をガード
- Property Inspector：`kingOfTimeUrl`（テキスト）/ `tokenKey`（テキスト）/ `token`（パスワード入力）を Global Settings に保存

#### 出勤ボタン（`com.hrk-m.kot-punch.clock-in`）

- State 0（未打刻）でボタンを押す：Puppeteer 経由で KOT に出勤打刻（`punchKot("#attend")`）→ 成功で `showOk()` + State 1 へ遷移
- State 1（打刻済み）でボタンを押す：State 0 にリセット（Puppeteer なし）
- 処理中（`_isProcessing = true`）はボタン入力を無視（連打防止）
- 設定未完了（`hasRequiredPunchSettings` が false）：`showAlert()` で Property Inspector へ誘導
- 打刻失敗：`showErrorImage()` + State 0 に戻す
- State はセッション内のみ保持（プラグイン再起動でリセット）
- Property Inspector には設定項目なし（Global Settings を open-kot と共有）

#### 退勤ボタン（`com.hrk-m.kot-punch.clock-out`）

- State 0（未打刻）でボタンを押す：Puppeteer 経由で KOT に退勤打刻（`punchKot("#leave")`）→ 成功で `showOk()` + State 1 へ遷移
- State 1（打刻済み）でボタンを押す：State 0 にリセット（Puppeteer なし）
- 処理中（`_isProcessing = true`）はボタン入力を無視（連打防止）
- 設定未完了（`hasRequiredPunchSettings` が false）：`showAlert()` で Property Inspector へ誘導
- 打刻失敗：`showErrorImage()` + State 0 に戻す
- State はセッション内のみ保持（プラグイン再起動でリセット）
- Property Inspector には設定項目なし（Global Settings を open-kot と共有）

---

## 非機能要件

| 項目 | 要件 |
|------|------|
| 対応 OS | macOS 12+、Windows 10+ |
| Stream Deck ソフトウェア | 6.9+ |
| Node.js ランタイム | v20（プラグイン内蔵） |

---

## 将来の機能候補

- KOT（KingOfTime）API との実際の打刻連携（API 呼び出し・エラーハンドリング）
- 打刻状態の表示（現在の勤怠ステータスをボタンに反映）
- 休憩打刻ボタン
- 出勤・退勤の排他制御（一方を押したらもう一方をリセット等）
- Windows 対応（`open-kot` アクション）
