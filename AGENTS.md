# AI 駆動開発とスペック駆動開発

KOT Punch プロジェクトにおける AI 駆動開発（AI-DLC）の実装ガイド。

## プロジェクトメモリ

要件・アーキテクチャの一次情報。実装前に必ず参照する。

| パス | 内容 |
|---|---|
| `docs/spec.md` | 機能要件・グローバル設定・アクション一覧。機能詳細は「機能詳細」セクションのリンクからたどる |
| `docs/architecture.md` | ディレクトリ構成・実装責務・パターン・テスト戦略 |
| `.claude/commands/` | プロジェクト全体の steering（`/steering` コマンドで管理） |
| `docs/tasks/{task-name}/` | `prd.md`（要件）+ `tasks.md`（実装チェックリスト） |

## 開発ガイドライン

- SDK docs: https://docs.elgato.com/streamdeck/sdk/introduction/getting-started
- プロジェクトファイルはすべて日本語で記述する

### コマンド

```bash
bun install --frozen-lockfile  # 依存関係インストール
bun run lint                   # lint
bun run test                   # テスト
bunx tsc --noEmit              # 型チェック
bun run generate-manifest      # manifest 再生成
bun run build                  # 本番ビルド
bun run logs                   # ログ監視
```

変更前の最小確認:

```bash
bun run lint && bun run test && bunx tsc --noEmit && bun run build
```

### コーディング規約

- TypeScript（ESM）。ローカル import は拡張子を省略する
- ダブルクォート・セミコロンを使用する
- ファイル名: kebab-case（`clock-in.ts`）、クラス名: PascalCase（`ClockIn`）
- アクション UUID: `com.hrk-m.kot-punch.<action-name>`
- `manifest.json` は手編集しない。`bun run generate-manifest` で再生成する

### 実装上の注意

- 新規アクション: `@action({ UUID: "com.hrk-m.kot-punch.<name>" })` を付与し `src/plugin.ts` に登録する
- 打刻系アクション: `BasePunchAction` を継承し `logger` / `selector` / `successMessage` のみ定義する
- KOT 操作ロジックは `services/kot/` に置く。`actions/` はイベントハンドリングのみ担当する
- 認証情報・トークン・`.env` の実値はコミットしない

### テスト上の注意

- Vitest（`environment: node`、coverage: `v8`）
- `@elgato/streamdeck` と Puppeteer は `vi.mock` で差し替える
- 長押し判定は fake timer で 2000ms 境界値を検証する
- `src/__tests__/architecture.test.ts` でディレクトリ構造を自動検証する（常にグリーンを保つ）

### コミット・PR ガイドライン

- Conventional Commit スタイル: `feat(scope): ...` / `fix` / `docs` / `test` / `chore`
- 1 コミット = 1 論理変更。構造変更と動作変更を混在させない
- PR には問題・解決の要約と検証エビデンス（lint / test / build）を含める

## 最小ワークフロー

- Phase 0（任意）: `/steering`
- Phase 1（仕様定義）: `/plan "機能の説明"` → `/task {feature}`
- Phase 2（実装）: `/impl {feature} [task-numbers]`
- PR 作成: `/create-pr {feature}`

## 開発ルール

- 3 フェーズ承認フロー: 仕様定義 → タスク生成 → 実装
- steering を最新に保ち `/steering` で整合性を確認する
- 指示に正確に従い自律的に作業を完結させる。質問は情報が本質的に不足している場合のみ行う
