# /plan — 要件定義・設計コマンド

<background_information>

**Mission**: 「何を作るか」を先に決め切る。

**Success Criteria**:
- タスク名が確定している
- 要件が `docs/tasks/{タスク名}/prd.md` に整理されている
- 最外ボタンの遷移元・遷移先画面・遷移後状態が確定している
- 要件確定後にのみ実装フェーズへ進んでいる

</background_information>

<instructions>

## Core Task

`$ARGUMENTS` からタスク名を特定し、`prd` スキルで要件を見直しながら `docs/tasks/{タスク名}/prd.md` を確定版に更新する。

---

## タスク名の決定

- 既存 kebab-case なら採用。自然文なら英小文字 kebab-case に正規化する
- 例: `/plan countupを3倍づつにして` → `countup-triple-multiplier`

---

## 実行手順（この順序で行う）

1. タスク名を確定する
2. 既存コード・UI を Read / Glob で把握する
3. **`AskUserQuestion` で ASCII モックアップ付きフローを提示してユーザーの合意を得る**（prd.md 作成前に必須）
   - 「合っている」「フローが違う」の二択を提示し、合意が取れるまで次フェーズに進めない
4. 合意した内容のみ `docs/tasks/{タスク名}/prd.md` に反映する
5. 最外ボタンの遷移仕様（遷移元 / 遷移先画面 / 遷移後状態）を確定する
6. 要件確定後の次アクションとして `/task {タスク名}` を明示する

---

## ボタン遷移確定（必須）

- 遷移元・遷移先画面名・到達直後の状態（初期表示 / loading / error 等）を確定する
- 条件分岐がある場合は条件ごとに記載する
- 未確定のまま `prd.md` に断定記述しない

---

## ドキュメント構造

```text
docs/
  spec.md                      # 全体機能要件（参照のみ）
  spec/{feature-name}.md       # 機能別詳細仕様（参照のみ）
  tasks/
    {タスク名}/
      prd.md                   # タスク要件
```

---

## 制約

- `prd` スキルを必ず使う
- 不明点は推測で埋めない
- 最外ボタンの遷移が未確定のまま `/task` へ進めない
- 既存 prd がある場合は上書きより追記・統合を優先する
- 要件の一次情報は `docs/tasks/{タスク名}/prd.md`。上位参照として `docs/spec.md` / `docs/spec/{feature-name}.md` を読む

---

## フォールバック

| 状況 | 対応 |
|------|------|
| `$ARGUMENTS` が空 | `AskUserQuestion` でタスク名を確認 |
| 要件・遷移が曖昧 | `AskUserQuestion` で確認が取れるまで確定しない |
| 回答が空・未選択 | 推測で進めず質問を再提示する |
| prd.md が未存在 | 新規作成する |

</instructions>

## ツール案内

- **Glob / Read**: 既存コード・prd.md の確認
- **AskUserQuestion**: フロー確認・遷移仕様の合意取得
  - 選択肢のどれも該当しない場合、ユーザーは自動的に表示される **"Other"** を選んで自由テキストを入力できる
  - `options` に "Other" を手動追加する必要はない（ツールが自動付与する）
  - ユーザーが "Other" を選択した場合は、入力内容を要件に反映してから次フェーズへ進む
- **Write / Edit**: `docs/tasks/{タスク名}/prd.md` の作成・更新

## 出力形式

チャットサマリーのみ（ファイルは直接更新）。

```
## Task Name: {タスク名}
## Requirements Review: 不足・矛盾・確定事項
## Updated File: docs/tasks/{タスク名}/prd.md
## Next Step: /task {タスク名}
```
