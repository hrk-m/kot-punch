# PRD: 退勤打刻（leave-punch）

## 概要

Stream Deck の退勤ボタンを押すと、Puppeteer 経由で KingOfTime (KOT) に退勤打刻を自動実行する。
現状の `ClockOut` は長押しリセット + ローカル設定の旧実装。本タスクで Puppeteer 打刻・State 管理を `ClockIn` と同パターンに刷新する。

## 現状のコードベース

| ファイル | 現状 |
|--------|------|
| `src/actions/clock-out.ts` | 旧実装（ローカル `punched` 設定 + 長押しリセット、Puppeteer なし） |
| `src/lib/puppeteer.ts` | `punchKot("#leave", settings)` はすでにサポート済み |
| `src/lib/settings.ts` | `attend-punch` タスクで `username` / `password` / `dryRun` 追加済み |

## システム要件

| 項目 | 内容 |
|------|------|
| プラットフォーム | macOS のみ（Stream Deck 6.9+） |
| 実行形式 | Stream Deck プラグイン（Node.js 20） |
| 自動化エンジン | `puppeteer`（フル版、既に `package.json` に追加済み） |
| データ永続化 | `streamDeck.settings.setGlobalSettings()` |
| SDK | `@elgato/streamdeck` v2+ |

## ユーザーストーリー

- ユーザーとして、Stream Deck の退勤ボタンを押すと Puppeteer が KOT への退勤打刻を自動実行し、成功後にボタンが打刻済み表示（State 1）になることを確認できる
- ユーザーとして、打刻処理中はボタンを押しても何も起きず、連打を防止できる
- ユーザーとして、打刻済み（State 1）の状態でボタンを押すと未打刻（State 0）に戻り、再度打刻できる

## 機能要件

### 1. ClockOut アクション（既存クラスを刷新）

**既存 UUID を維持**: `com.hrk-m.kot-punch.clock-out`

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

> 長押し動作は削除する。`onKeyDown` / `onWillAppear` も不要になるため削除し、`onKeyUp` のみに整理する。

#### 連打防止

`onKeyUp` の冒頭で処理中フラグ（`_isProcessing`）を確認し、立っていれば即 return する。処理中フラグは打刻開始時に ON、完了（成功・失敗）時に OFF にする。

### 2. 打刻処理フロー（既存 Puppeteer 関数を使用）

`src/lib/puppeteer.ts` の `punchKot("#leave", settings)` を呼び出す。実装は `ClockIn` と同一パターン。

```
1. kingOfTimeUrl へアクセス（setupAuthenticatedPage）
2. JWT トークンをセット（tokenKey + token）
3. ページリロード（認証適用）
4. #leave ボタンをクリック
5. username でユーザーを確認・選択
6. パスワード入力（delay: 100ms）
7. submit クリック（dryRun=false の場合のみ）
8. ブラウザを閉じる
```

### 3. 設定管理（変更なし）

`attend-punch` タスクで追加済みの Global Settings をそのまま使用する。

| キー | 型 | 説明 |
|------|-----|------|
| `kingOfTimeUrl` | `string` | 打刻画面の URL |
| `username` | `string` | KOT 画面上に表示される名前 |
| `password` | `string` | 打刻確認時のパスワード |
| `tokenKey` | `string` | JWT トークンの Key |
| `token` | `string` | JWT トークン値 |
| `dryRun` | `boolean` | `true` のとき submit をスキップ |

### 4. 通知仕様

| 状況 | 方法 |
|------|------|
| 打刻成功 | `showOk()` + `setState(1)` |
| 打刻失敗 | `showErrorImage()` 既存ユーティリティを使用 + `setState(0)` |
| 設定未完了 | `showAlert()` で Property Inspector を開くよう誘導 |

## 画面遷移

| 状態 | 遷移元 | 操作 | 遷移先状態 |
|------|--------|------|------------|
| State 0（未打刻） | 初期表示 / State 1 からのリセット | — | 打刻可能 |
| 処理中 | State 0 | ボタンを押す | 連打防止フラグ ON・Puppeteer 起動 |
| 処理中にボタンを押す | 処理中 | ボタンを押す | 無効（何もしない） |
| State 1（打刻済み） | 処理中 | 打刻成功 | showOk() + 打刻済みアイコン・フラグ OFF |
| State 0（未打刻） | 処理中 | 打刻失敗 | showErrorImage() + フラグ OFF |
| State 0（未打刻） | State 1 | ボタンを押す | 未打刻に戻す（Puppeteer なし） |

## 実装アーキテクチャ（変更箇所のみ）

```
src/
  actions/
    clock-out.ts               # 旧実装を ClockIn と同パターンに全面刷新
  actions/__tests__/
    clock-out.test.ts          # 旧テストを新仕様に合わせて書き換え
```

> `src/lib/` および `manifest.json` / `ui/` への変更は不要。

## 非機能要件

| 項目 | 内容 |
|------|------|
| dryRun | `true` のとき submit をスキップ（テスト用） |
| 連打防止 | 処理中フラグで `onKeyUp` をガード |
| セキュリティ | `password` / `token` は Property Inspector で `type="password"` でマスク表示（設定画面は既存） |

## スコープ外

- ClockIn の変更（実装済み）
- OpenKot の変更（実装済み）
- 日次リセット・深夜タイマー
- Windows 対応
- Location（office / remote）区分打刻
- スケジュール打刻（手動トリガーのみ）
