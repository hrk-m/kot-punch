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

- 初期表示：ボタンに `出勤` を表示
- 短押し（500ms 未満）：`✅` に表示を切り替え、打刻済みフラグを Settings に保存
- 長押し（500ms 以上）：初期ラベル `出勤` にリセット
- 打刻済み状態（`punched: true`）は永続化され、Stream Deck 再起動後も保持
- Property Inspector には設定項目なし（UI は空）

#### 退勤ボタン（`com.hrk-m.kot-punch.clock-out`）

- 初期表示：ボタンに `退勤` を表示
- 短押し（500ms 未満）：`✅` に表示を切り替え、打刻済みフラグを Settings に保存
- 長押し（500ms 以上）：初期ラベル `退勤` にリセット
- 打刻済み状態（`punched: true`）は永続化され、Stream Deck 再起動後も保持
- Property Inspector には設定項目なし（UI は空）

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
