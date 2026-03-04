# Architecture: KOT Punch

## ビルドフロー

```
src/plugin.ts
  └─ アクション登録 + streamDeck.connect()
       │
       ▼
  Rollup (TypeScript → CommonJS + terser)
       │
       ▼
  com.hrk-m.kot-punch.sdPlugin/bin/plugin.js
```

本番ビルドは minify 済み。ウォッチモードは sourcemap 付きでビルドし、`streamdeck restart` を自動実行する。

---

## ディレクトリ責務

### `src/`

| パス | 責務 |
|------|------|
| `plugin.ts` | エントリポイント。アクション登録と `streamDeck.connect()` のみ記述 |
| `actions/` | `SingletonAction<Settings>` を継承したアクションクラス群 |
| `actions/__tests__/` | アクションのユニットテスト（vitest） |

### `com.hrk-m.kot-punch.sdPlugin/`

| パス | 責務 |
|------|------|
| `manifest.json` | プラグインメタデータ・アクション定義（UUID, アイコン, OS 要件） |
| `imgs/` | アイコン画像（通常 + @2x） |
| `ui/` | Property Inspector HTML（sdpi-components 使用） |
| `bin/` | ビルド成果物（gitignore 対象） |
| `logs/` | ランタイムログ（gitignore 対象） |

---

## アクション実装パターン

新しいアクションを追加するときは以下の順に実装する：

1. `src/actions/<name>.ts` に `SingletonAction<Settings>` 継承クラスを作成
2. `@action({ UUID: "com.hrk-m.kot-punch.<name>" })` デコレータを付与
3. `src/plugin.ts` で `streamDeck.actions.registerAction()` に登録
4. `manifest.json` の `Actions` 配列に UUID・アイコン・Controllers を追記
5. `com.hrk-m.kot-punch.sdPlugin/ui/<name>.html` に Property Inspector を追加（必要な場合）

### SDK ライフサイクルの使い分け

| イベント | 用途 |
|----------|------|
| `onWillAppear` | ボタン表示時の初期タイトル・状態設定 |
| `onKeyDown` | キー押下時のメイン処理 |
| `setSettings` / `getSettings` | アクション設定の永続化 |
| `setTitle` | ボタン上のテキスト更新 |

---

## テスト戦略

- `@elgato/streamdeck` は Stream Deck プロセスへの接続が必要なため、ユニットテストでは `vi.mock` で差し替える
- `ev.action`（`setTitle`, `setSettings`）は `vi.fn()` でスタブ化して検証する
- テストフレームワーク: vitest
