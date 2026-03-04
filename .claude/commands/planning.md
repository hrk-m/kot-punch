# /planning — 要件定義・設計コマンド

<background_information>

- **Mission**: このフローの主目的は「何を作るか」を先に決め切ること
- **Success Criteria**:
  - タスク名（対象機能）が確定している
  - 要件に関する確認結果が `docs/tasks/{タスク名}/prd.md` に整理されている
  - 要件確定後にのみ Architecture / 実装タスクへ進んでいる

</background_information>

<instructions>
## Core Task
`$ARGUMENTS` からタスク名を特定し、**`prd` スキルを使って要件を見直し**ながら `docs/tasks/{タスク名}/prd.md` を確定版に更新する。

## Skill Usage (Required)

- このコマンドでは `prd` スキルを必ず使う
- 要件ヒアリング・構造化・品質チェックの進め方は `prd` スキルのワークフローに従う
- `planning.md` では `prd` スキルと重複する手順説明を持たない

## ドキュメント構造

```text
docs/
  tasks/
    {タスク名}/
      prd.md                 # 機能要件（Product Requirements Document）
```

## このコマンド固有の進め方

- まずタスク名（対象機能）を確定する。曖昧なら対話で先に決める
- `docs/tasks/{タスク名}/prd.md` を作成または更新する
- 要件の不明点はユーザーに確認し、確定事項のみ `prd.md` へ反映する
- 要件確定後にのみ Architecture / 実装タスクへ進む（フェーズ分離）

## Important Constraints

- 要件定義の一次情報は `docs/tasks/{タスク名}/prd.md` とする
- 不明点は推測で埋めない
- 既存 PRD がある場合は上書きより追記・統合を優先する

</instructions>

## Tool Guidance

- **Glob**: `docs/tasks/{タスク名}/` の存在確認と再開判定に使う
- **Read**: 既存 `docs/tasks/{タスク名}/prd.md` を読んで更新方針を決める
- **AskUserQuestion**: 要件の不明点確認に使う
- **Write**: `docs/tasks/{タスク名}/prd.md` の新規作成または更新に使う

## Output Description

ユーザー入力と同じ言語で、以下の構成で出力する:

1. **Task Name**: 確定したタスク名
2. **Requirements Review**: `prd` スキルに基づく見直し結果（不足・矛盾・確定事項）
3. **Updated File**: `docs/tasks/{タスク名}/prd.md` の更新結果
4. **Next Step**: 要件確定後に進むコマンド（`/planning` 継続または `/task {最初のタスク名}`）

**Format Requirements**:

- Markdown 見出し（##, ###）を使う
- コマンドはコードブロックで示す
- 出力は簡潔に保つ（目安 300 語以内）
- 明確でプロフェッショナルな文体にする

## Safety & Fallback

- **Task Name Missing**: `$ARGUMENTS` が空なら AskUserQuestion でタスク名を確認する
- **Ambiguous Requirement**: 判断不能な要件は AskUserQuestion で確認が取れるまで確定しない
- **Empty Answer**: AskUserQuestion の回答が空または未選択の場合、推測で進めてはならない。質問を再提示して回答を求める
- **PRD Not Found**: `docs/tasks/{タスク名}/prd.md` がなければ新規作成する
- **Write Failure**: 失敗したパスを示し、権限・ディスク容量・パス誤りを確認するよう案内する
