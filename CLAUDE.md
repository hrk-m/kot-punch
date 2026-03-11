# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Overview

KingOfTime (KOT) 向け Stream Deck プラグイン。`@elgato/streamdeck` + TypeScript + Rollup で構成。

- SDK docs: https://docs.elgato.com/streamdeck/sdk/introduction/getting-started

## Commands

```bash
# 依存関係インストール
bun install --frozen-lockfile

# lint / test / typecheck（CI と同じ品質ゲート）
bun run lint
bun run test
bunx tsc --noEmit

# manifest 再生成（labels / template 更新時）
bun run generate-manifest

# 本番ビルド（manifest 生成 + Rollup）
bun run build

# ログ監視（Stream Deck プラグインのログをリアルタイム表示）
bun run logs
```

## Architecture

### Build Flow

`manifest.template.json` → `scripts/generate-manifest.mts` → `com.hrk-m.kot-punch.sdPlugin/manifest.json`

`src/plugin.ts` → Rollup (TypeScript + 単一 ESM bundle + terser) → `com.hrk-m.kot-punch.sdPlugin/bin/plugin.js`

`bun run build` は manifest を再生成してから Rollup を実行し、最後に `bun install --production --cwd com.hrk-m.kot-punch.sdPlugin` で runtime 依存を plugin package 側へ配置する。

### Directory Responsibilities

```text
src/
  plugin.ts              # エントリポイント（アクション登録 + connect）
  actions/               # ClockIn / ClockOut / OpenKot / OpenRequest
  actions/__tests__/     # アクション単体テスト
  lib/                   # settings / puppeteer / showErrorImage / notify / logger
  lib/__tests__/         # ライブラリ単体テスト
com.hrk-m.kot-punch.sdPlugin/
  manifest.json          # 生成物（手編集しない）
  package.json           # plugin 側 production dependency 定義
  ui/                    # Property Inspector HTML
  imgs/                  # アイコン（通常 + @2x）
  bin/                   # ビルド成果物
```

## Action Behavior (Current)

- `clock-in` / `clock-out`: `onKeyUp` で打刻を実行。State 0→1、State 1 は 0 にリセット。連打防止の `_isProcessing` ガードあり。
- `open-kot`: 認証済みブラウザを開くだけのアクション。必須設定不足時は `showAlert()`。
- `open-request`: 申請画面へログイン済みブラウザを開くだけのアクション。必須設定不足時は `showAlert()`。
- 共通失敗処理: `showErrorImage()` を fire-and-forget で呼び出す。

## Implementation Notes

- 新規アクションは `@action({ UUID: "com.hrk-m.kot-punch.<name>" })` を付与し、`src/plugin.ts` で登録する。
- `manifest.template.json` を更新したら `bun run generate-manifest` を実行する。
- ローカル import は拡張子を省略する（TypeScript が解決するため）。

## Testing Notes

- テストフレームワークは Vitest（`environment: node`、coverage provider は `v8`）。
- `@elgato/streamdeck` と Puppeteer は `vi.mock` で差し替えてユニットテストする。
- 変更前の最小確認コマンド:

```bash
bun run lint && bun run test && bunx tsc --noEmit && bun run build
```

## Workflow

### Paths

- Steering: `.claude/commands/steering.md`（`/steering` コマンドで管理）
- Specs: `docs/spec/`（機能単位の仕様書）

### Steering vs Specification

**Steering** (`.claude/commands/`) — AI に対するプロジェクト全体のルールとコンテキストを定義する。命名規則・アーキテクチャ方針・禁止事項など普遍的なガイドを置く。

**Specs** (`docs/spec/`) — 個別機能の要件・設計・タスクを仕様書として管理する。機能ごとにファイルを分割し、実装の根拠として参照する。

### Active Specifications

- `docs/spec/` 配下の仕様書を確認する
- `/steering` でプロジェクト知識（steering）を確認・更新する

### Minimal Workflow

- Phase 0（任意）: `/steering`
- Phase 1（仕様定義）:
  - `/plan "機能の説明"` — 要件定義・設計ドキュメントを生成
  - `/task {feature}` — 実装タスク一覧を生成
- Phase 2（実装）:
  - `/impl {feature} [task-numbers]` — タスク番号を指定して実装
- PR 作成: `/create-pr {feature}`
