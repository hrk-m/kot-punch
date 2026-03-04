# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

KingOfTime (KOT) 向け Stream Deck プラグイン。Elgato Stream Deck SDK (`@elgato/streamdeck`) を使用した TypeScript プロジェクト。

- SDK ドキュメント: https://docs.elgato.com/streamdeck/sdk/introduction/getting-started

## Commands

```bash
# 依存関係インストール
bun install

# ビルド（本番用）
bun run build

# 開発用ウォッチモード（変更検知 + Stream Deck プラグイン自動再起動）
bun run watch
```

## Architecture

### ビルドフロー

`src/plugin.ts` → Rollup (TypeScript + CommonJS + terser) → `com.hrk-m.kot-punch.sdPlugin/bin/plugin.js`

本番ビルドは minify 済み。ウォッチモードは sourcemap 付きでビルドし、`streamdeck restart com.hrk-m.kot-punch` を自動実行する。

### ディレクトリ構成

```
src/
  plugin.ts          # エントリポイント: アクション登録 + streamDeck.connect()
  actions/           # アクションクラス群（@elgato/streamdeck の SingletonAction を継承）
com.hrk-m.kot-punch.sdPlugin/
  manifest.json      # プラグインメタデータ・アクション定義（UUID, アイコン, OS 要件等）
  imgs/              # アイコン画像（通常 + @2x）
  ui/                # Property Inspector HTML（sdpi-components を使用: https://sdpi-components.dev/docs/components/button）
  bin/               # ビルド成果物（gitignore 対象）
  logs/              # ランタイムログ（gitignore 対象）
```

### アクションの追加パターン

1. `src/actions/` に `SingletonAction<Settings>` を継承したクラスを作成
2. `@action({ UUID: "com.hrk-m.kot-punch.<name>" })` デコレータを付与
3. `src/plugin.ts` で `streamDeck.actions.registerAction()` に登録
4. `manifest.json` の `Actions` 配列に UUID・アイコン・コントローラ等を追記
5. 必要に応じて `com.hrk-m.kot-punch.sdPlugin/ui/` に Property Inspector HTML を追加

### SDK イベントの主なライフサイクル

- `onWillAppear`: ボタンが画面に表示されたとき（タイトル・状態の初期化に使用）
- `onKeyDown` / `onKeyUp`: キー押下イベント
- `setSettings` / `getSettings`: アクションのパーシスタント設定の読み書き
- `setTitle`: ボタン上に表示するテキストの更新
