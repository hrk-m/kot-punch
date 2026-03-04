# PRD: KOT Punch

## 概要

KingOfTime (KOT) 向け Elgato Stream Deck プラグイン。Stream Deck のボタンから直接 KOT の勤怠操作（打刻など）を行うことを目的とする。

- **対象ユーザー**: KOT を使用し、Stream Deck を所持する開発者・業務従事者
- **提供価値**: 勤怠打刻をワンボタン化することによる操作コストの削減

---

## コア機能

### 実装済み

#### Counter アクション（`com.hrk-m.kot-punch.increment`）

- Stream Deck ボタンを押すたびにカウンターが増加する
- ボタン上にカウント値をタイトルとして表示する
- `incrementBy`（1〜5）を Property Inspector でユーザーが設定可能
- カウント値はアクションの永続設定（`setSettings`）に保存される

---

## 非機能要件

| 項目 | 要件 |
|------|------|
| 対応 OS | macOS 12+、Windows 10+ |
| Stream Deck ソフトウェア | 6.9+ |
| Node.js ランタイム | v20（プラグイン内蔵） |

---

## 将来の機能候補

- KOT 打刻アクション（出勤・退勤・休憩）
- 打刻状態の表示（現在の勤怠ステータスをボタンに反映）
- KOT 認証情報の設定
