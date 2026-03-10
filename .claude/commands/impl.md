# /impl — タスク実行コマンド

タスク: $ARGUMENTS

## 0. 目的と完了条件

- 目的: `docs/tasks/{タスク名}/` のタスクを TDD で実装する
- 完了条件: 指定チェック項目が実装済み / `tasks.md` のチェックボックスが更新済み / 検証結果（test/lint/build）を提示済み

## 1. 引数解釈

`$ARGUMENTS` を次の順で解釈する。

- 第 1 引数: タスク名（kebab-case、`docs/tasks/{タスク名}/` に対応）
- タスク選択子（任意）: `1`, `1.1`, `1,2.1` のような Phase 指定
- その他（例: `$1`）: 実行メタ情報として保持し、タスク解決には使わない

例: `/impl countup-triple-multiplier $1 1.1` → タスク名: `countup-triple-multiplier`、対象: `Phase 1.1`

タスク選択子が未指定の場合は `tasks.md` の未完了項目（`- [ ]`）を上から順に実行する。

## 2. 事前チェック

実装前に次を確認し、不足があれば対応コマンドを案内して停止する。

| ファイル | 不足時の対応 |
|---|---|
| `docs/tasks/{タスク名}/tasks.md` | `/task {タスク名}` を先に実行 |
| `docs/tasks/{タスク名}/prd.md` | `/plan {タスク名}` を先に実行 |
| `docs/architecture.md` | `/steering` を先に実行 |

## 3. コンテキスト読込と対象確定

`docs/tasks/{タスク名}/tasks.md` / `docs/tasks/{タスク名}/prd.md` / `docs/architecture.md` を読み、今回の対象を確定する。

確定時に整理する項目:

- 今回対応するチェック項目（`tasks.md` 由来）
- 完了条件（`prd.md` の Acceptance Criteria 由来）
- 変更対象ファイル（影響範囲）と非対象（Non-Goals）

## 4. タスク選択ルール

| 選択子 | 対象 |
|---|---|
| `1` | `## Phase 1` 配下の未完了項目 |
| `1.1` | `### Phase 1.1` 配下の未完了項目 |
| `1,2.1` | 各指定の未完了項目を結合 |
| 未指定 | 未完了項目を上から全て |

不正な指定（存在しない Phase）が含まれる場合は実装を停止し、正しい指定を確認する。

## 5. 実装ルール（TDD Mandatory）

各チェック項目を RED → GREEN → REFACTOR サイクルで実装する。

- `tasks.md` のスコープ外は実装しない
- `prd.md` と矛盾する振る舞いを入れない
- 既存構造を崩す大規模リファクタは行わない
- 未確定事項は推測で埋めず、TODO として明示する

## 6. スキル適用ルール

| タスクの性質 | 使用スキル |
|---|---|
| 新機能実装・バグ修正 | `.agents/skills/test-driven-development/SKILL.md` |
| バグ調査・テスト失敗・予期しない動作 | `.agents/skills/systematic-debugging/SKILL.md` |
| TypeScript の型設計・型安全性 | `.agents/skills/typescript-advanced-types/SKILL.md` |

複数該当する場合は全て適用する。

## 7. 検証ゲート

完了報告前に必ず実行し、1 つでも失敗したら完了扱いにしない。

```bash
bun run test && bun run lint && bun run build
```

- 失敗時は原因と修正方針を示して再実行する
- 検証結果（コマンドと pass/fail）を必ず報告する

## 8. タスク状態更新

- 完了項目を `tasks.md` で `[x]` に更新する
- 未完了項目は `[ ]` のまま残す
- 新たな作業が見つかった場合は既存項目を汚さず追記する

## 9. 出力フォーマット

1. **Tasks Executed**: 完了した Phase/チェック項目
2. **Files Changed**: 変更ファイル一覧
3. **Verification**: `test/lint/build` の結果
4. **Remaining**: 未完了タスク数と次に着手すべき項目

## 10. このプロジェクト固有ルール

- アクション追加時は `manifest.json` へ UUID を登録する
- ビルド成果物は `com.hrk-m.kot-punch.sdPlugin/bin/` に出力される
- Property Inspector の変更は `com.hrk-m.kot-punch.sdPlugin/ui/` を編集する
- `@elgato/streamdeck` SDK 規約（`SingletonAction` 継承、`@action`）を守る
