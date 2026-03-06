# PRD: 認証済み状態での KOT 勤怠画面オープン（open-admin-authenticated）

## 概要

Stream Deck の「勤怠画面を開く」ボタンを押下すると、JWT クッキーをセット済みの Chrome ウィンドウで
KOT 勤怠画面（`kingOfTimeUrl`）を開く。
ユーザーはログイン操作なしで勤怠画面を即座に操作できる。

## ユーザーストーリー

- ユーザーとして、Stream Deck の「勤怠画面を開く」ボタンを押すと、すでにログイン済みの状態で KOT 勤怠画面が Chrome で表示される

## 機能要件

### アクション定義

| UUID | クラス名 | 概要 |
|------|----------|------|
| `com.hrk-m.kot-punch.open-kot` | `OpenKot` | JWT 認証済み状態で KOT 勤怠画面を開く |

### 動作フロー

```
1. ボタン押下（onKeyUp）
   └ _isProcessing フラグが立っていれば即 return（連打防止）
2. 設定（kingOfTimeUrl / tokenKey / token）の存在チェック
   └ 未設定 → showAlert() で Property Inspector へ誘導して終了
3. puppeteer でブラウザを起動（headless: false、--start-maximized）
4. kingOfTimeUrl へアクセス（domain 確立）
5. JWT クッキーをセット（{ name: tokenKey, value: token }）
   ※ domain 未指定 → 現在のページのドメインが自動適用される
6. kingOfTimeUrl へ再アクセス（認証適用）
   └ ダイアログ検出 → 認証失敗とみなし browser.close() してエラーをスロー
7. ブラウザを切断（browser.disconnect()）— ウィンドウは開いたまま
8. エラー発生時 → showErrorImage() でエラー画像を 3 秒表示
```

> `browser.close()` ではなく `browser.disconnect()` を使い、Chrome ウィンドウをユーザーに残す。
>
> 参照実装（`attend-kingoftime/src/punch-script.ts`）でも `setCookie` に domain を指定せず、
> 現在のページ URL からドメインを自動適用する方式を採用している。これに揃える。
>
> `kingOfTimeUrl` には section / param などのクエリパラメータが含まれる場合がある。
> URL をそのまま `goto()` の引数に渡す。

### 設定項目（Global Settings）

| キー | 型 | 説明 |
|------|----|------|
| `kingOfTimeUrl` | `string` | 勤怠画面 URL（例: `https://kingoftime-recorder.appspot.com/login?section=1000&param=...`） |
| `tokenKey` | `string` | JWT クッキー名（例: `htjwt_xxxxx`） |
| `token` | `string` | JWT トークン値 |

勤怠画面 URL は固定値ではなく `kingOfTimeUrl` 設定値を使用する（ユーザーごとに異なる）。

### 通知

| 状況 | 方法 |
|------|------|
| 設定未完了 | `showAlert()` で Property Inspector を開くよう誘導 |
| エラー | `showErrorImage(ev.action)` でエラー画像を 3 秒表示（フォールバック: `showAlert()`） |

### 連打防止

`onKeyUp` の冒頭で `_isProcessing` フラグを確認し、立っていれば即 return する（`onKeyDown` は使用しない）。

## 非機能要件

| 項目 | 内容 |
|------|------|
| ブラウザ | `puppeteer` バンドル済み Chromium を使用（`executablePath` 不要） |
| headless | `false`（ウィンドウを表示） |
| ウィンドウサイズ | `--start-maximized` で最大化、`defaultViewport: null` でビューポート制限なし |
| devtools | `false`（通常起動） |
| 連打防止 | 処理中フラグで `onKeyUp` をガード |

## 実装アーキテクチャ

```
src/
  actions/
    open-kot.ts               # OpenKot クラス（UUID: com.hrk-m.kot-punch.open-kot）
  lib/
    puppeteer.ts              # openKotPage() 関数（dialog 検出 + 認証失敗ハンドリング）
    settings.ts               # GlobalSettings 型・getGlobalSettings() / hasRequiredSettings()
    showErrorImage.ts         # 共通エラー画像表示ユーティリティ
com.hrk-m.kot-punch.sdPlugin/
  manifest.json               # open-kot アクション追記（自動生成）
  ui/
    open-kot.html             # Property Inspector（kingOfTimeUrl / tokenKey / token 入力）
  imgs/
    actions/open-kot/         # 勤怠画面アイコン
```

### puppeteer.ts の実装

```typescript
export async function openKotPage(settings: GlobalSettings): Promise<void> {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: ["--start-maximized"],
        });
        const pages = await browser.pages();
        const page = pages[0] ?? (await browser.newPage());
        // 1. 勤怠画面へアクセス（domain 確立）
        await page.goto(kingOfTimeUrl);
        // 2. JWT クッキーをセット（domain 指定なし → 現在ページのドメインが適用）
        await page.setCookie({ name: tokenKey, value: token });
        // 3. 再アクセスして認証適用。ダイアログ = 認証失敗として扱う
        let hasAuthDialog = false;
        page.on("dialog", async (dialog) => { hasAuthDialog = true; await dialog.dismiss(); });
        await page.goto(kingOfTimeUrl);
        if (hasAuthDialog) {
            await browser.close();
            throw new Error("Authentication failed: dialog appeared while opening KING OF TIME.");
        }
        // 4. ウィンドウを残したまま切断
        await browser.disconnect();
    } catch (e) {
        await browser?.close();
        throw e;
    }
}
```

## 画面遷移

| 状態 | 遷移元 | 操作 | 遷移先状態 |
|------|--------|------|-----------|
| 通常 | ボタン表示中 | 短押し（設定あり・認証成功） | Chrome が認証済み勤怠画面を表示 |
| 通常 | ボタン表示中 | 短押し（設定なし） | showAlert + Property Inspector 誘導 |
| 通常 | ボタン表示中 | 短押し（認証失敗・エラー） | showErrorImage（3秒後リセット） |
| 処理中 | 処理中 | 任意のキー操作 | 無効（連打防止） |

## スコープ外

- dryRun 対応（打刻とは異なり submit がないため不要）
- 既存打刻アクション（attend / leave）への影響
- Windows 対応

---

## 実装メモ（現在の修正方針）

### `puppeteer-core` → `puppeteer` への移行（2026-03-06）

当初は `puppeteer-core` を使い、`executablePath` でシステム Chrome を直接指定する方針だった。
しかし以下の理由から `puppeteer`（バンドル済み Chromium 付き）に切り替えた。

**変更理由：**
- `executablePath` に macOS のパスをハードコードしていたため、環境依存が生じていた
- `puppeteer` を使えば Chromium をパッケージが管理するため `executablePath` が不要になる
- `defaultViewport: null` + `--start-maximized` でウィンドウを最大化表示できる

**変更箇所：**
- `package.json`: `puppeteer-core` → `puppeteer`
- `src/lib/puppeteer.ts`: import 変更・`CHROME_PATH` 定数削除・起動オプション変更
- 認証失敗時のエラーメッセージを明示化（`"Authentication failed: dialog appeared while opening KING OF TIME."`）
