# Spec: KOT Punch

## 概要

KING OF TIME (KOT) 向け Stream Deck プラグイン。Stream Deck のボタンを押すだけで出勤・退勤打刻と KOT 管理画面の表示を実行できる。

**価値**: 打刻操作をブラウザを開かずにワンボタンで完結させ、打刻漏れと操作ミスを低減する。

---

## グローバル設定

Stream Deck のグローバル設定で以下を管理する。設定は全アクションで共有される。

| 設定項目 | 型 | 用途 |
|----------|----|------|
| `kingOfTimeUrl` | string | KOT の URL |
| `tokenKey` | string | JWT クッキーのキー名 |
| `token` | string | JWT トークン値 |
| `username` | string | 打刻ユーザー名 |
| `password` | string | 打刻パスワード |
| `dryRun` | boolean | true の場合、submit をスキップして動作確認のみ行う |

**必須項目の区分**:
- Open KOT: `kingOfTimeUrl`, `tokenKey`, `token`
- 打刻（Clock In / Clock Out）: 上記 3 項目 + `username`, `password`

---

## 機能詳細

- [打刻ボタン（Clock In / Clock Out）](./spec/punch.md)
- [Open KOT（KOT を開く）](./spec/open-kot.md)

---

## アクション一覧

| アクション | 何をするか | 必須設定 |
|---|---|---|
| **Clock In**（出勤打刻） | ボタン押下で KOT 出勤打刻を自動実行。成功でアイコンがチェックマークに変わる | `kingOfTimeUrl` / `tokenKey` / `token` / `username` / `password` |
| **Clock Out**（退勤打刻） | ボタン押下で KOT 退勤打刻を自動実行。成功でアイコンがチェックマークに変わる | 同上 |
| **Open KOT** | JWT 認証済みの Chrome で KOT 管理画面を開く。ブラウザはそのまま操作できる状態で引き渡される | `kingOfTimeUrl` / `tokenKey` / `token` |

