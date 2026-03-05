# KOT 打刻プラグイン — 要件定義

King of Time (KOT) への勤怠打刻を、Stream Deck から自動実行するプラグイン。

---

## システム要件

| 項目 | 内容 |
|------|------|
| プラットフォーム | macOS のみ（Stream Deck 6.9+） |
| 実行形式 | Stream Deck プラグイン（Node.js 20） |
| 自動化エンジン | `puppeteer-core`（システム Chrome を使用） |
| Chrome パス | `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`（固定） |
| データ永続化 | `streamDeck.settings.setGlobalSettings()` |
| SDK | `@elgato/streamdeck` v2+ |

---

## アクション一覧

| UUID | クラス名 | 概要 |
|------|----------|------|
| `com.hrk-m.kot-punch.attend` | `AttendAction` | 出勤打刻 |
| `com.hrk-m.kot-punch.leave` | `LeaveAction` | 退勤打刻 |
| `com.hrk-m.kot-punch.open-admin` | `OpenAdminAction` | KOT 管理画面をブラウザで開く |

---

## 機能要件

### 1. 打刻ボタン（AttendAction / LeaveAction）

出勤・退勤は独立したボタンとして実装する。各ボタンは 2 ステートを持つ。

#### ステート定義

| State | 表示 | 意味 |
|-------|------|------|
| 0 | 通常アイコン | 打刻可能 |
| 1 | ✅ マーク | 打刻済み・操作無効 |

#### 操作仕様

| 操作 | State 0（通常） | State 1（済み） |
|------|----------------|----------------|
| 短押し | Puppeteer 打刻実行 → 成功で State 1 へ | **無効（何もしない）** |
| 長押し（1 秒以上） | 手動で State 1 へ設定（打刻なし） | **無効（何もしない）** |
| 処理中 | タイトル「処理中...」を表示・操作無効 | — |

#### 連打防止

`onKeyDown` の冒頭で処理中フラグを確認し、立っていれば即 return する。

### 2. 打刻処理フロー（Puppeteer）

```
1. kingOfTimeUrl へアクセス
2. JWT クッキーをセット（tokenKey + token）
3. ページリロード（認証適用）
4. AttendAction → #attend クリック / LeaveAction → #leave クリック
5. username でユーザーを確認・選択
6. パスワード入力（delay: 100ms）
7. submit クリック（dryRun=false の場合のみ）
8. ブラウザを閉じる
```

### 3. KOT 管理画面を開く（OpenAdminAction）

押下時に `streamDeck.system.openUrl("https://s3.kingtime.jp/admin")` を実行する。

### 4. 設定管理

設定はすべて `streamDeck.settings.setGlobalSettings()` で永続化する。

#### Global Settings キー一覧

| キー | 型 | 説明 |
|------|-----|------|
| `kingOfTimeUrl` | `string` | 打刻画面の URL |
| `username` | `string` | KOT 画面上に表示される名前 |
| `password` | `string` | 打刻確認時のパスワード |
| `tokenKey` | `string` | JWT クッキー名（例: `htjwt_xxxxx`） |
| `token` | `string` | JWT トークン値 |
| `dryRun` | `boolean` | `true` のとき submit をスキップ（テスト用） |
| `YYYYMMDD-attend` | `boolean` | 出勤済みフラグ（日次） |
| `YYYYMMDD-leave` | `boolean` | 退勤済みフラグ（日次） |

#### Property Inspector

- 設定項目：`kingOfTimeUrl`・`username`・`password`・`tokenKey`・`token`・`dryRun`
- `password` / `token` は `<input type="password">` でマスク表示
- 設定未完了時：`showAlert()` で Property Inspector を開くよう誘導

### 5. 日次リセット

打刻済みフラグを日次でリセットし、毎日初期状態（State 0）に戻す。

#### リセットのタイミング（2 段構え）

| タイミング | 処理 |
|-----------|------|
| `onWillAppear` 時 | 保存フラグの日付が今日でなければ State 0 にリセット（Stream Deck 起動・ページ遷移で確実に復帰） |
| 深夜 0 時タイマー | `plugin.ts` 起動時に次の 0:00 までの ms を計算して `setTimeout` → リセット後に翌日分を再スケジュール（再帰） |

#### 実装イメージ

```typescript
// plugin.ts
function scheduleResetAtMidnight() {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    const ms = nextMidnight.getTime() - now.getTime();

    setTimeout(async () => {
        await resetDailyFlags();
        scheduleResetAtMidnight(); // 翌日分を再スケジュール
    }, ms);
}
```

---

## 非機能要件

| 項目 | 内容 |
|------|------|
| dryRun | Property Inspector で ON/OFF。`true` のとき Puppeteer の submit をスキップ |
| devtools | `puppeteer-core` の `devtools: true` オプション（デバッグ時に有効化） |
| 連打防止 | 処理中フラグで `onKeyDown` をガード |
| セキュリティ | `password` / `token` は Property Inspector で `type="password"` によるマスク表示 |

### 通知

| 状況 | 方法 |
|------|------|
| 打刻成功 | `showOk()` + `setState(1)` でボタンを済みに更新 |
| 打刻失敗 | `showAlert()` + `setTitle("エラー")` |
| 処理中 | `setTitle("処理中...")` |
| 設定未完了 | `showAlert()` で Property Inspector を開くよう誘導 |

---

## 実装アーキテクチャ

```
src/
  plugin.ts                   # エントリポイント + scheduleResetAtMidnight()
  actions/
    base-punch-action.ts      # 共通ロジック（Puppeteer 呼び出し・長押し・リセット）
    attend-action.ts          # AttendAction（#attend セレクタ）
    leave-action.ts           # LeaveAction（#leave セレクタ）
    open-admin-action.ts      # OpenAdminAction
  lib/
    puppeteer.ts              # Puppeteer 操作ロジック
    settings.ts               # Global Settings 読み書きヘルパー
    flags.ts                  # 日次フラグ管理（キー生成・リセット処理）
com.hrk-m.kot-punch.sdPlugin/
  manifest.json               # アクション定義（3 アクション）
  ui/
    punch.html                # AttendAction / LeaveAction 共通 Property Inspector
  imgs/
    actions/attend/           # 出勤アイコン（通常・済み）
    actions/leave/            # 退勤アイコン（通常・済み）
    actions/open-admin/       # 管理画面アイコン
```

---

## スコープ外

- フラグ削除機能
- Windows 対応
- Location（office / remote）区分打刻
- スケジュール打刻（手動トリガーのみ）
