# PRD: 出勤打刻（attend-punch）

## 概要

Stream Deck の出勤ボタンを押すと、Puppeteer 経由で KingOfTime (KOT) に出勤打刻を自動実行する。
現状の `ClockIn` は表示切り替えのみ。本タスクで Puppeteer 打刻・設定管理を追加実装する。

## 現状のコードベース

| ファイル | 現状 |
|--------|------|
| `src/actions/clock-in.ts` | 表示切り替えのみ（Puppeteer 呼び出しなし） |
| `src/lib/puppeteer.ts` | `puppeteer`（フル版）で KOT ページを開くのみ。打刻クリックは未実装 |
| `src/lib/settings.ts` | `kingOfTimeUrl` / `tokenKey` / `token` のみ定義 |

## システム要件

| 項目 | 内容 |
|------|------|
| プラットフォーム | macOS のみ（Stream Deck 6.9+） |
| 実行形式 | Stream Deck プラグイン（Node.js 20） |
| 自動化エンジン | `puppeteer`（フル版、既に `package.json` に追加済み） |
| データ永続化 | `streamDeck.settings.setGlobalSettings()` |
| SDK | `@elgato/streamdeck` v2+ |

## ユーザーストーリー

- ユーザーとして、Stream Deck の出勤ボタンを押すと Puppeteer が KOT への出勤打刻を自動実行し、成功後にボタンが打刻済み表示（State 1）になることを確認できる
- ユーザーとして、打刻処理中はボタンを押しても何も起きず、連打を防止できる
- ユーザーとして、打刻済み（State 1）の状態でボタンを押すと未打刻（State 0）に戻り、再度打刻できる
- ユーザーとして、設定画面から KOT の URL・ユーザー名・パスワード・JWT トークンを登録できる

## 機能要件

### 1. ClockIn アクション（既存クラスを拡張）

**既存 UUID を維持**: `com.hrk-m.kot-punch.clock-in`

#### ステート定義

| State | 表示 | 意味 |
|-------|------|------|
| 0 | 通常アイコン | 打刻可能（未打刻） |
| 1 | 打刻済みアイコン（チェックマーク） | 打刻済み・リセット可能 |

#### 操作仕様

| 操作 | State 0（未打刻） | State 1（打刻済み） |
|------|------------------|---------------------|
| ボタンを押す | Puppeteer 打刻実行 → 成功で State 1 へ | State 0 に戻す（Puppeteer なし） |
| 処理中にボタンを押す | 無効（連打防止フラグでガード） | — |

#### 連打防止

`onKeyUp` の冒頭で処理中フラグを確認し、立っていれば即 return する。処理中フラグは打刻開始時に ON、完了（成功・失敗）時に OFF にする。

### 2. 打刻処理フロー（Puppeteer）

`src/lib/puppeteer.ts` の `openKotPage` を拡張し、打刻セレクタを引数で受け取る関数を追加する。

```
1. kingOfTimeUrl へアクセス（既存の goto 処理を再利用）
2. JWT トークンをセット（tokenKey + token）
3. ページリロード（認証適用）
4. #attend ボタンをクリック
5. username でユーザーを確認・選択
6. パスワード入力（delay: 100ms）
7. submit クリック（dryRun=false の場合のみ）
8. ブラウザを閉じる
```

### 3. 設定管理（Global Settings）

`src/lib/settings.ts` を拡張して以下のキーを追加する。

| キー | 型 | 現状 | 対応 |
|------|-----|------|------|
| `kingOfTimeUrl` | `string` | 実装済み | そのまま |
| `tokenKey` | `string` | 実装済み | そのまま |
| `token` | `string` | 実装済み | そのまま |
| `username` | `string` | 未定義 | 追加 |
| `password` | `string` | 未定義 | 追加 |
| `dryRun` | `boolean` | 未定義 | 追加 |

`hasRequiredSettings` の判定条件も `username` / `password` を含むよう更新する。

#### Property Inspector

- 設定項目：`kingOfTimeUrl`・`username`・`password`・`tokenKey`・`token`・`dryRun`
- `password` / `token` は `<input type="password">` でマスク表示
- 設定未完了時：`showAlert()` で Property Inspector を開くよう誘導

### 4. 通知仕様

| 状況 | 方法 |
|------|------|
| 打刻成功 | `showOk()` + `setState(1)` |
| 打刻失敗 | `showErrorImage()` 既存ユーティリティを使用 |
| 設定未完了 | `showAlert()` で Property Inspector を開くよう誘導 |

## 実装アーキテクチャ（変更箇所のみ）

```
src/
  actions/
    clock-in.ts                # Puppeteer 呼び出し・連打防止に拡張
  lib/
    puppeteer.ts               # punchKot(selector, settings) 関数を追加
    settings.ts                # username / password / dryRun を追加
com.hrk-m.kot-punch.sdPlugin/
  ui/
    clock-in.html              # Property Inspector（未作成 → 新規）
```

## 画面遷移

| 状態 | 遷移元 | 操作 | 遷移先状態 |
|------|--------|------|------------|
| State 0（未打刻） | ボタン表示時（初期） | — | 打刻可能 |
| 処理中 | State 0 | ボタンを押す | 連打防止フラグ ON・Puppeteer 起動 |
| 処理中にボタンを押す | 処理中 | ボタンを押す | 無効（何もしない） |
| State 1（打刻済み） | 処理中 | 打刻成功 | showOk() + 打刻済みアイコン・フラグ OFF |
| State 0（未打刻） | 処理中 | 打刻失敗 | showErrorImage() + フラグ OFF |
| State 0（未打刻） | State 1 | ボタンを押す | 未打刻アイコンに戻す（Puppeteer なし） |

## 非機能要件

| 項目 | 内容 |
|------|------|
| dryRun | `true` のとき submit をスキップ（テスト用） |
| 連打防止 | 処理中フラグで `onKeyUp` をガード |
| セキュリティ | `password` / `token` は `type="password"` でマスク表示 |

## スコープ外

- ClockOut（退勤）への Puppeteer 打刻追加（別タスク）
- OpenKot の変更（実装済み）
- Windows 対応
- Location（office / remote）区分打刻
- スケジュール打刻（手動トリガーのみ）
