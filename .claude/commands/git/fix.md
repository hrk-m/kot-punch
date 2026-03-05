---
description: 貼り付けられたレビューコメント修正を Codex CLI に委譲して適用・検証する
allowed-tools: Bash, Read, Write, Edit, MultiEdit, Grep, Glob, LS
argument-hint: (no-args)
---

# /git:fix - レビュー修正委譲コマンド

会話に貼り付けられたレビューコメントを解析し、修正作業を `codex exec` に委譲して実行する。

---

## 0. 目的と完了条件

- 目的: レビュー指摘を妥当性評価したうえで、必要な修正を安全に適用する
- 完了条件:
  - レビュー本文を取得し、各指摘を `対応 / 非対応 / 対応失敗` に分類している
  - 各指摘について「修正すべきか」の判断理由を明示している
  - `対応` のみ修正を試行し、完了後に `make fix` と `make check` を報告している
  - Codex 実行失敗時は終了コードと主要エラーを示して停止している

---

## 1. 入力取得（Required）

1. 直近の会話からレビューコメント本文を取得する（引数は使わない）。
2. 本文が見つからない場合は、レビュー本文の貼り付けを依頼して停止する。

---

## 2. 実行前チェック（Required）

1. `command -v codex` で Codex CLI の存在を確認する。
2. `codex` が見つからない場合はインストールを依頼して停止する。
3. `git status --short` を実行し、作業ツリー状態を確認する。
4. 既存の未関連差分は巻き戻さない。

---

## 3. コンテキスト読込（Required）

Codex へ委譲する前に、最低限次を確認する。

- `AGENTS.md`
- `.kiro/steering/` 配下
- レビュー本文（全指摘）

確認結果として、以下を整理してから委譲する。

- 指摘一覧（番号付き）
- 影響範囲（想定ファイル）
- 検証観点（どのテスト/チェックで担保するか）

---

## 4. 修正要否の判定ルール（Required）

各指摘を修正前に判定し、理由を残す。判定観点は次のとおり。

- 正確性: 指摘が事実に基づくか
- 仕様整合: `AGENTS.md` / 設計方針 / 既存要件と整合するか
- 影響度: バグ、セキュリティ、保守性、可読性への影響があるか
- コスト対効果: 変更規模に対して改善効果が十分か

分類ルール:

- `対応`: 修正価値が高く、現時点で安全に適用できる
- `非対応`: 指摘が不正確、または今回は修正不要（意図的仕様・効果薄・過剰対応）
- `対応失敗`: 対応方針は妥当だが、実装または検証で失敗した

---

## 5. スキル適用ルール

レビュー内容に応じて、Codex に以下スキルの利用を明示する。

| 指摘の性質 | 使用スキル |
|---|---|
| バグ修正・実装変更 | `.agents/skills/test-driven-development/SKILL.md` |
| 再現調査・原因分析が必要 | `.agents/skills/systematic-debugging/SKILL.md` |
| TypeScript の型安全性 | `.agents/skills/typescript-advanced-types/SKILL.md` |
| セキュリティ懸念 | `.agents/skills/security-best-practices/SKILL.md` |
| UI 動作検証 | `.agents/skills/webapp-testing/SKILL.md` |
| 完了前の検証証跡確認 | `.agents/skills/verification-before-completion/SKILL.md` |
| Node.js バックエンド設計 | `.agents/skills/nodejs-backend-patterns/SKILL.md` |

複数該当する場合は全て適用する。

---

## 6. Codex 委譲実行（Required）

レビュー本文を含む一時プロンプトを作成し、Codex へ次を必須要件として渡す。

1. `AGENTS.md` と `.kiro/steering/` を読み、方針に従う
2. 各指摘を `対応 / 非対応 / 対応失敗` に分類し、修正要否の判断理由を書く
3. `対応` のみ自動修正を試行し、失敗しても次の指摘へ進む
4. 修正後に `make fix` と `make check` を実行し、結果を記録する
5. 最終報告は日本語で、分類一覧・判断理由・検証結果を含める

実行例:

```bash
codex exec \
  -C "$(pwd)" \
  -a never \
  -s workspace-write \
  --output-last-message /tmp/codex-git-fix-last.txt \
  "$(cat /tmp/codex-git-fix-prompt.txt)"
```

Codex の終了コードが 0 以外なら停止し、標準出力/標準エラーの要点を報告する。

---

## 7. 事後確認（Required）

1. `git status --short` と必要に応じて `git diff` で変更内容を確認する。
2. 無関係な差分が混入していないか確認する。
3. `make fix` / `make check` が未実行または失敗なら、その事実を明記する。

---

## 8. 出力フォーマット

出力は日本語で、次の順序で簡潔に示す。

1. `対応: X件 / 非対応: Y件 / 対応失敗: Z件`
2. 対応一覧（指摘要約、修正理由、主な変更ファイル）
3. 非対応一覧（指摘要約、非対応理由）
4. 対応失敗一覧（ある場合のみ。失敗理由と次アクション）
5. 検証結果（`make fix` / `make check` の成否）

---

## 9. 重要制約

- 修正実装は必ず Codex CLI に委譲し、直接パッチしない
- 実行不能条件（レビュー本文不足・codex 未導入）以外はユーザー確認待ちせず進める
- 無関係なリファクタや過剰最適化は行わない
- 既存の未関連差分を巻き戻さない

---

## 10. フォールバック

- レビュー本文が未提供: 本文貼り付けを依頼して停止
- codex が未導入: インストールを依頼して停止
- codex 実行失敗: 終了コードと主要エラーを報告して停止
- 検証未完了: `make fix` / `make check` の未実行または失敗を明示
