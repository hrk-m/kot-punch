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

# 開発ウォッチ（変更検知 + Stream Deck プラグイン自動再起動）
bun run watch
```

## Architecture

### Build Flow

`src/plugin.ts` → Rollup (TypeScript + CommonJS + terser) → `com.hrk-m.kot-punch.sdPlugin/bin/plugin.js`

watch 時は sourcemap を有効化し、`streamdeck restart com.hrk-m.kot-punch` を実行する。

### Directory Responsibilities

```text
src/
  plugin.ts              # エントリポイント（アクション登録 + connect）
  actions/               # ClockIn / ClockOut / OpenKot
  actions/__tests__/     # アクション単体テスト
  lib/                   # settings / puppeteer / showErrorImage
  lib/__tests__/         # ライブラリ単体テスト
  labels/labels.json     # manifest 用ラベル

com.hrk-m.kot-punch.sdPlugin/
  manifest.json          # 生成物（手編集しない）
  ui/                    # Property Inspector HTML
  imgs/                  # アイコン（通常 + @2x）
  bin/                   # ビルド成果物
```

## Action Behavior (Current)

- `clock-in` / `clock-out`: `onKeyUp` で打刻を実行。State 0→1、State 1 は 0 にリセット。連打防止の `_isProcessing` ガードあり。
- `open-kot`: 認証済みブラウザを開くだけのアクション。必須設定不足時は `showAlert()`。
- 共通失敗処理: `showErrorImage()` を fire-and-forget で呼び出す。

## Implementation Notes

- 新規アクションは `@action({ UUID: "com.hrk-m.kot-punch.<name>" })` を付与し、`src/plugin.ts` で登録する。
- `manifest.template.json` / `src/labels/labels.json` を更新したら `bun run generate-manifest` を実行する。
- ローカル import は `.js` 拡張子付きで統一する。

## Testing Notes

- テストフレームワークは Vitest（`environment: node`、coverage provider は `v8`）。
- `@elgato/streamdeck` と Puppeteer は `vi.mock` で差し替えてユニットテストする。
- 変更前の最小確認コマンド:

```bash
bun run lint && bun run test && bunx tsc --noEmit && bun run build
```
