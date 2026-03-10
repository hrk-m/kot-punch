# Spec: KOT Punch

## 概要

KING OF TIME (KOT) 向け Stream Deck プラグイン。Stream Deck のボタンを押すだけで出勤・退勤打刻と KOT 勤怠画面の表示を実行できる。

**価値**: 打刻操作をブラウザを開かずにワンボタンで完結させ、打刻漏れと操作ミスを低減する。

---

## グローバル設定

Stream Deck のグローバル設定で以下を管理する。設定は全アクションで共有される。

| 設定項目 | 型 | 用途 |
|----------|----|------|
| `kotPunchUrl` | string | KOT 勤怠/打刻画面の URL |
| `kotPunchKey` | string | JWT クッキーのキー名 |
| `kotPunchToken` | string | JWT トークン値 |
| `kotPunchUsername` | string | 打刻ユーザー名 |
| `kotPunchPassword` | string | 打刻パスワード |
| `kotPunchDryRun` | boolean | true の場合、submit をスキップして動作確認のみ行う |
| `requestUrl` | string | 申請画面ログイン URL |
| `requestUsername` | string | 申請画面ログインユーザー名 |
| `requestPassword` | string | 申請画面ログインパスワード |

**必須項目の区分**:
- Open KOT: `kotPunchUrl`, `kotPunchKey`, `kotPunchToken`
- 打刻（Clock In / Clock Out）: 上記 3 項目 + `kotPunchUsername`, `kotPunchPassword`
- Open Request: `requestUrl`, `requestUsername`, `requestPassword`

**Property Inspector の設定分担**:
- `ui/clock-in.html` / `ui/clock-out.html`: 打刻用 KOT 設定一式と `kotPunchDryRun`
- `ui/open-kot.html`: KOT 認証に必要な 3 項目のみ
- `ui/open-request.html`: 申請画面用の 3 項目のみ

---

## 共通動作

### macOS システム通知

全 4 アクション（Clock In / Clock Out / Open KOT / Open Request）は、処理成功時に macOS 通知センターへポップアップ通知を送る（`lib/notify.ts` が担当）。

| アクション | 通知メッセージ |
|---|---|
| Clock In | `出勤打刻が完了しました` |
| Clock Out | `退勤打刻が完了しました` |
| Open KOT | `KING OF TIME を開きました` |
| Open Request | `申請画面を開きました` |

- 通知の title は `"KOT Punch"` 固定
- エラー時は通知しない（既存の `showErrorImage()` のみ動作）
- 通知送信は fire-and-forget（失敗してもメイン処理に影響しない）

---

## 機能詳細

- [打刻ボタン（Clock In / Clock Out）](./spec/punch.md)
- [Open KOT（KOT を開く）](./spec/open-kot.md)
- [Open Request（申請画面を開く）](./spec/open-request.md)

---

## アクション一覧

| アクション | 何をするか | 必須設定 |
|---|---|---|
| **Clock In**（出勤打刻） | 短押しで KOT 出勤打刻を自動実行。成功でアイコンがチェックマークに変わり、2 秒到達まで長押しすると state を即時手動更新できる | `kotPunchUrl` / `kotPunchKey` / `kotPunchToken` / `kotPunchUsername` / `kotPunchPassword` |
| **Clock Out**（退勤打刻） | 短押しで KOT 退勤打刻を自動実行。成功でアイコンがチェックマークに変わり、2 秒到達まで長押しすると state を即時手動更新できる | 同上 |
| **Open KOT** | JWT 認証済みの Chrome で KOT 勤怠画面を開く。ブラウザはそのまま操作できる状態で引き渡される | `kotPunchUrl` / `kotPunchKey` / `kotPunchToken` |
| **Open Request**（申請画面を開く） | 申請画面にログイン済みの Chrome を開く | `requestUrl` / `requestUsername` / `requestPassword` |

