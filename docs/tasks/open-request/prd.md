# PRD: 申請画面を開く（open-request）

## 概要

Stream Deck の「申請画面を開く」ボタンを押下すると、Puppeteer が `requestUrl` のログインフォームに
`requestUsername` / `requestPassword` を自動入力してログインし、ブラウザをユーザーに引き渡す。

**価値**: 申請画面ログインの手動操作をワンボタン化し、操作時間と入力ミスを減らす。

---

## ユーザーストーリー

- ユーザーとして、Stream Deck の「申請画面を開く」ボタンを押したら、申請画面へログイン済みの Chrome ウィンドウをすぐに操作したい

---

## 機能要件

### アクション定義

| UUID | クラス名 | 概要 |
|------|----------|------|
| `com.hrk-m.kot-punch.open-request` | `OpenRequest` | 申請画面にログインして Chrome を引き渡す |

### 動作フロー

```
1. ボタン押下（onKeyUp）
   └ _isProcessing が true なら即 return（連打防止）

2. getRequestSettings() で設定取得

3. 必須項目チェック（requestUrl / requestUsername / requestPassword）
   └ 未設定 → showAlert() で終了

4. Puppeteer 起動（headless: false, defaultViewport: null, --start-maximized）

5. requestUrl へアクセス

6. ログインフォームへ入力
   - page.type("#login_id", requestUsername)
   - page.type("#login_password", requestPassword)

7. submit + 遷移待ち
   - Promise.all([
       page.waitForNavigation({ waitUntil: "networkidle0" }),
       page.click("#login_button"),
     ])

8. browser.disconnect()（ウィンドウをユーザーへ引き渡す）

エラー発生時
- browser.close() でクリーンアップ
- showErrorImage(ev.action) でエラー表示
```

### グローバル設定

| キー | 型 | 説明 |
|------|----|------|
| `requestUrl` | `string` | 申請画面ログイン URL |
| `requestUsername` | `string` | 申請画面ログイン ID |
| `requestPassword` | `string` | 申請画面ログイン PW |

### 通知

| 状況 | 方法 |
|------|------|
| 設定未完了 | `showAlert()` |
| ログイン失敗・エラー | `showErrorImage(ev.action)`（3秒表示） |

### 連打防止

`_isProcessing` フラグで `onKeyUp` 冒頭をガードする。

---

## 非機能要件

| 項目 | 内容 |
|------|------|
| ブラウザ | `puppeteer` バンドル済み Chromium |
| headless | `false` |
| ウィンドウサイズ | `--start-maximized`, `defaultViewport: null` |
| 設定取得 | `getRequestSettings()` で `RequestSettings` を取得 |

---

## 実装アーキテクチャ

```
src/
  actions/
    open-request.ts                     # OpenRequest クラス
  lib/
    settings.ts                         # RequestSettings / getRequestSettings() /
                                        # hasRequiredRequestSettings()
    puppeteer.ts                        # openRequestPage()

com.hrk-m.kot-punch.sdPlugin/
  ui/
    open-request.html                   # Property Inspector（requestUrl / requestUsername / requestPassword）
  imgs/
    actions/open-request/               # 申請画面アイコン
```

---

## スコープ外

- JWT クッキー認証（open-kot/punch 用）
- dryRun 対応（ログインでは不要）
- Windows 対応
