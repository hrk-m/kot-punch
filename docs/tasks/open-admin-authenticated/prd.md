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
| `com.hrk-m.kot-punch.open-admin` | `OpenAdminAction` | JWT 認証済み状態で KOT 勤怠画面を開く |

### 動作フロー

```
1. ボタン押下
2. 設定（kingOfTimeUrl / tokenKey / token）の存在チェック
   └ 未設定 → showAlert() で Property Inspector へ誘導して終了
3. puppeteer-core でシステム Chrome を起動（headless: false）
4. kingOfTimeUrl へアクセス（例: https://kingoftime-recorder.appspot.com/login?section=...）
5. JWT クッキーをセット（{ name: tokenKey, value: token }）
   ※ domain 未指定 → 現在のページのドメインが自動適用される
6. kingOfTimeUrl へ再アクセス（認証適用）
7. ブラウザを切断（browser.disconnect()）— ウィンドウは開いたまま
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
| 処理中 | `setTitle("処理中...")` |
| 成功（ブラウザ起動後） | タイトルを元に戻す |
| 設定未完了 | `showAlert()` で Property Inspector を開くよう誘導 |
| エラー | `showAlert()` + `setTitle("エラー")` |

### 連打防止

`onKeyDown` の冒頭で処理中フラグを確認し、立っていれば即 return する。

## 非機能要件

| 項目 | 内容 |
|------|------|
| Chrome パス | `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`（固定） |
| headless | `false`（ウィンドウを表示） |
| devtools | `false`（通常起動） |
| 連打防止 | 処理中フラグで `onKeyDown` をガード |

## 実装アーキテクチャ

```
src/
  actions/
    open-admin-action.ts      # OpenAdminAction（新規）
  lib/
    puppeteer.ts              # openKotPage() 関数を追加
    settings.ts               # Global Settings 読み書きヘルパー（新規）
com.hrk-m.kot-punch.sdPlugin/
  manifest.json               # open-admin アクション追記
  ui/
    open-admin.html           # Property Inspector（kingOfTimeUrl / tokenKey / token 入力）
  imgs/
    actions/open-admin/       # 勤怠画面アイコン
```

### puppeteer.ts に追加する関数

参照実装（`attend-kingoftime/src/punch-script.ts`）の `punch()` を参考に実装する。

```typescript
const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export async function openKotPage(settings: GlobalSettings): Promise<void> {
    const browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: false,
    });
    const page = await browser.newPage();
    // 1. 勤怠画面へアクセス（domain 確立）
    await page.goto(settings.kingOfTimeUrl);
    // 2. JWT クッキーをセット（domain 指定なし → 現在ページのドメインが適用）
    await page.setCookie({
        name: settings.tokenKey,
        value: settings.token,
    });
    // 3. 再アクセスして認証適用
    await page.goto(settings.kingOfTimeUrl);
    // 4. ウィンドウを残したまま切断
    await browser.disconnect();
}
```

## 画面遷移

| 状態 | 遷移元 | 操作 | 遷移先状態 |
|------|--------|------|-----------|
| 通常 | ボタン表示中 | 短押し（設定あり） | 処理中 → Chrome が認証済み勤怠画面を表示 |
| 通常 | ボタン表示中 | 短押し（設定なし） | showAlert + Property Inspector 誘導 |
| 処理中 | 処理中 | 任意のキー操作 | 無効（連打防止） |

## スコープ外

- dryRun 対応（打刻とは異なり submit がないため不要）
- 既存打刻アクション（attend / leave）への影響
- Windows 対応
