# /impl — タスク実行コマンド

タスク: $ARGUMENTS

---

## 0. 目的と完了条件

- 目的: `docs/tasks/{タスク名}/` のタスクを TDD で実装する
- 完了条件:
  - 指定タスクのチェック項目が実装済み
  - `tasks.md` の対象チェックボックスが更新済み
  - 検証コマンド（test/lint/build）の結果を提示済み

---

## 1. 引数解釈（Required）

`$ARGUMENTS` を次の順で解釈する。

- 第1引数: タスク名（kebab-case、`docs/tasks/{タスク名}/` に対応）
- タスク選択子（任意）: `1`, `1.1`, `1,2.1` のような Phase 指定
- その他（例: `$1`）: 実行メタ情報として保持し、タスク解決には使わない

例:

```text
/impl countup-triple-multiplier $1 1.1
```

- タスク名: `countup-triple-multiplier`
- 実行対象: `Phase 1.1`

タスク選択子が未指定の場合は、`tasks.md` の未完了項目（`- [ ]`）を上から順に実行する。

---

## 2. 事前チェック（Required）

実装前に次を確認する。

- `docs/tasks/{タスク名}/tasks.md` が存在する
- `docs/tasks/{タスク名}/prd.md` が存在する
- `docs/architecture.md` が存在する

不足時の対応:

- `tasks.md` がない: `/task {タスク名}` を先に実行
- `prd.md` がない: `/plan {タスク名}` を先に実行
- `architecture.md` がない: `/steering` を先に実行

---

## 3. コンテキスト読込と対象確定（Required）

以下を読み、今回の対象を確定する。

- `docs/tasks/{タスク名}/tasks.md`
- `docs/tasks/{タスク名}/prd.md`
- `docs/architecture.md`

確定時に必ず整理する:

- 今回対応するチェック項目（`tasks.md` 由来）
- 完了条件（`prd.md` の Acceptance Criteria 由来）
- 変更対象ファイル（影響範囲）
- 非対象（Non-Goals）

---

## 4. タスク選択ルール（Deterministic）

- `1` 指定: `## Phase 1` 配下の未完了項目のみ対象
- `1.1` 指定: `### Phase 1.1` 配下の未完了項目のみ対象
- `1,2.1` 指定: 各指定の未完了項目を結合して対象化
- 指定がない場合: 未完了項目を上から全て対象

不正な指定（存在しない Phase）が含まれる場合は実装を停止し、正しい指定を確認する。

---

## 5. 実装ルール（TDD Mandatory）

各チェック項目を次のサイクルで実装する。

```text
RED:   失敗するテストを先に作成し、失敗を確認
GREEN: テストを通す最小実装のみ追加
REFACTOR: テスト通過後にのみ整理
```

追加ルール:

- `tasks.md` のスコープ外は実装しない
- `prd.md` と矛盾する振る舞いを入れない
- 既存構造を崩す大規模リファクタは行わない
- 未確定事項は推測で埋めず、TODO として明示する

---

## 6. スキル適用ルール

実装内容に応じて次のスキルを適用する。

| タスクの性質 | 使用スキル |
|---|---|
| 新機能実装・バグ修正 | `.agents/skills/test-driven-development/SKILL.md` |
| バグ調査・テスト失敗・予期しない動作 | `.agents/skills/systematic-debugging/SKILL.md` |
| TypeScript の型設計・型安全性 | `.agents/skills/typescript-advanced-types/SKILL.md` |
| セキュリティ要件 | `.agents/skills/security-best-practices/SKILL.md` |
| ブラウザ自動化 | `.agents/skills/puppeteer-automation/SKILL.md` |
| UI 検証 | `.agents/skills/webapp-testing/SKILL.md` |
| Node.js API/バックエンド | `.agents/skills/nodejs-backend-patterns/SKILL.md` |

複数該当する場合は全て適用する。

---

## 7. 検証ゲート（必須）

完了報告前に必ず実行する。

```bash
bun run test
bun run lint
bun run build
```

ルール:

- 1つでも失敗したら完了扱いにしない
- 失敗時は原因と修正方針を示して再実行する
- 検証結果（コマンドと pass/fail）を必ず報告する

---

## 8. タスク状態更新（Required）

- 実装完了したチェック項目を `tasks.md` で `[x]` に更新する
- 未完了項目は `[ ]` のまま残す
- 新たな作業が見つかった場合は、既存項目を汚さず追記する

---

## 9. 出力フォーマット

出力は簡潔に次の順序で示す。

1. Tasks Executed: 完了した Phase/チェック項目
2. Files Changed: 変更ファイル一覧
3. Verification: `test/lint/build` の結果
4. Remaining: 未完了タスク数と次に着手すべき項目

---

## 10. このプロジェクト固有ルール

- アクション追加時は `manifest.json` へ UUID を登録する
- ビルド成果物は `com.hrk-m.kot-punch.sdPlugin/bin/` に出力される
- Property Inspector の変更は `com.hrk-m.kot-punch.sdPlugin/ui/` を編集する
- `@elgato/streamdeck` SDK 規約（`SingletonAction` 継承、`@action`）を守る
