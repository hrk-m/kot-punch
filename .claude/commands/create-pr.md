# /create-pr — PR本文生成・作成コマンド

<background_information>

- **Mission**: 実装内容を初見のレビュアーでも理解できる Pull Request を作成し、作成後に Entire 状態をリセットする
- **Success Criteria**: タスク名を渡すと PR title + body を生成し `gh pr create` で作成。成功後に `entire reset -f` / `entire clean -f` を実行。PR 本文に **なぜ修正したか / 何を修正したか / 影響範囲 / 検証結果** を必ず含める。`docs/tasks/{タスク名}` と `.entire` の両方を参照して文脈を補完する。

</background_information>

<instructions>

## Core Task

`$ARGUMENTS` からタスク名を特定し、`docs/tasks/{タスク名}/` と `.entire/metadata/` を根拠に **GitHub PR の title + body** を生成し、`gh pr create` で PR を作成する。

## Task Name Input Rules

- `$ARGUMENTS` はタスク名（kebab-case）として扱う（例: `countup-triple-multiplier`）
- 自然文が入力された場合は推測で進めず、`docs/tasks/{タスク名}/` の存在確認で確定する
- タスクが確定できない場合は PR 作成を停止してタスク名確認を行う

## Required Context Load

1. `docs/tasks/{タスク名}/prd.md`
2. `docs/tasks/{タスク名}/tasks.md`
3. Git 差分（対象ブランチの変更ファイルと要点）
4. `.entire/metadata/**` のうち、タスク名を含む `summary.txt` / `context.md` / `prompt.txt`

## .entire 参照ルール

- タスク名をキーに `.entire/metadata` を検索し、最新の関連セッションを優先参照する
- 抽出対象: 修正背景（なぜ）/ 実装方針・判断理由 / 検証コマンドと結果 / Non-Goals・後続課題
- 会話ログはそのまま転載せず PR 向けに要約する
- `.entire` と Git 差分が矛盾する場合は **Git 差分を正** とし、必要なら補足を入れる

## PR Content Requirements

PR 本文の必須セクション:

1. **概要**
2. **背景（なぜこの修正が必要か）**
3. **変更内容（何を修正したか）**
4. **影響範囲**
5. **動作確認**
6. **未対応・今後の対応（必要な場合）**

追加ルール:

- 「変更内容」はファイル単位で具体化する（例: `src/actions/increment-counter.ts` で何を変えたか）
- 「影響範囲」には **影響あり** と **影響なし** を明示する
- 用語を最小限にし、前提知識なしでも読める文にする
- prd の Acceptance Criteria と実装結果の対応が追えるように書く

## PR Title Rules

- Conventional Commits 形式（`feat:` / `fix:` / `refactor:` / `docs:` など）
- 1 行で簡潔に、詳細は本文で補う

## Body Template

```markdown
## 概要
- ...

## 背景
- 課題:
- 修正理由:

## 変更内容
- `path/to/file`: 変更点

## 影響範囲
- 影響あり:
- 影響なし:

## 動作確認
- `bun run test`: 結果
- `bun run lint`: 結果
- `bun run build`: 結果

## 未対応・今後の対応
- ...
```

## PR 作成と .entire リセット

次の順序を必ず守る:

1. PR title + body を確定する
2. `gh pr create` で PR を作成する（`--title` と `--body-file` を使う）
3. **PR 作成が成功した場合のみ** `entire reset -f` → `entire clean -f` を実行する
4. `entire` リセット失敗時はその失敗を明記し再実行手順を提示する

禁止事項: PR 作成前・失敗時に `.entire` をリセットしない / `.entire` を `rm -rf` で直接削除しない（`entire` CLI を使う）

## Important Constraints

- 根拠のない推測で PR を書かない
- `docs/tasks/{タスク名}` と `.entire` の両方を確認するまで確定文面を出さない
- 差分にない変更を「実施済み」と書かない
- 初見のレビュアーが理解できない省略表現を避ける
- PR URL を取得できるまで完了扱いにしない
- `entire reset -f` / `entire clean -f` の実行結果を確認する

</instructions>

## Tool Guidance

| ツール | 用途 |
|---|---|
| `Glob` / `Read` | `docs/tasks/{タスク名}/` の読込 |
| `Read` | `.entire/metadata/**` の関連情報読込 |
| `Bash` | `git diff` / `git log` で差分確認 |
| `Bash` | `gh pr create` で PR 作成、`entire reset -f` / `entire clean -f` で後処理 |
| `Write` | PR 本文の整形結果を返す |

## Output Description

1. **PR URL**: 作成された PR の URL
2. **PR Title**: 実際に作成した 1 行タイトル
3. **PR Body**: 実際に使用した Markdown
4. **Entire Reset Status**: `entire reset -f` と `entire clean -f` の結果
5. **Sources Used**: 参照した `docs/tasks/...` と `.entire/...` の一覧
6. **Notes**: 情報不足や未確定事項があれば明記

## Safety & Fallback

| 状況 | 対応 |
|---|---|
| Task Name Missing | `$ARGUMENTS` が空ならタスク名確認を行う |
| Task Docs Missing | `prd.md` または `tasks.md` がなければ不足ファイルを案内する |
| Entire Metadata Missing | その旨を明記し `docs/tasks` + Git 差分のみで作成する |
| No Diff Found | 「PR 作成可能な変更が未検出」として停止する |
| PR Creation Failed | エラー内容を明示し `.entire` リセットを実行せず停止する |
| Entire Reset Failed | PR 作成成功後のリセット失敗時は失敗コマンドと再実行手順を提示する |
