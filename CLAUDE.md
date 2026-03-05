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
  ui/                # Property Inspector HTML（sdpi-components を使用: https://sdpi-components.dev/docs/components）
                     # 設定項目がない場合は空 body で OK
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
- `onKeyDown`: キー押下時に発火。長押し判定タイマーを起動し、メイン処理は `onKeyUp` で行う
- `onKeyUp`: キーが離されたとき。短押し判定後にメイン処理を実行する
- `setSettings` / `getSettings`: アクションのパーシスタント設定の読み書き
- `setTitle`: ボタン上に表示するテキストの更新

> キーイベントはキー（ボタン）専用。ダイアル・タッチスクリーンには `onDialDown` / `onDialUp` を使う。
> 詳細: https://docs.elgato.com/streamdeck/sdk/guides/keys/#onkeydown

#### Multi-Action での状態制御

マルチアクション内では `ev.payload.isInMultiAction` が `true` になり、`ev.payload.userDesiredState` で目的の状態インデックス（0 or 1）を取得できる。

#### 長押し検出パターン

SDK にネイティブの長押しイベントがないため、タイマーで実装する。閾値は 500ms。

```typescript
private _longPressTimer: ReturnType<typeof setTimeout> | undefined;
private _isLongPress = false;

onKeyDown(ev) {
    this._isLongPress = false;
    this._longPressTimer = setTimeout(() => {
        this._isLongPress = true;
        // 長押しアクションを実行
    }, 500);
}

onKeyUp(ev) {
    clearTimeout(this._longPressTimer);
    if (this._isLongPress) return; // 長押し済みなら短押しアクションをスキップ
    // 短押しアクションを実行
}
```

テストでは `vi.useFakeTimers()` と `vi.advanceTimersByTimeAsync()` で時間を制御する。
