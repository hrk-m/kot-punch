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
| `lib/settings.ts` | Global Settings 読み書きヘルパー。`KotPunchSettings` 型定義（`kotPunchUrl` / `kotPunchKey` / `kotPunchToken` / `kotPunchUsername` / `kotPunchPassword` / `kotPunchDryRun`）および `RequestSettings` 型定義（`requestUrl` / `requestUsername` / `requestPassword`）・`getGlobalSettings()` / `getRequestSettings()` / `hasRequiredSettings()` / `hasRequiredPunchSettings()` / `hasRequiredRequestSettings()` を提供 |
| `lib/puppeteer.ts` | `punchKot(selector, settings)` / `openKotPage(settings)` / `openRequestPage(settings)` 関数。Puppeteer で Chrome を起動し必要な認証情報を適用。`punchKot` は打刻ボタンクリック・ユーザー選択・パスワード入力・submit まで実行（`kotPunchDryRun` 時は submit スキップ）。`openKotPage` / `openRequestPage` は認証後に `disconnect()` でユーザーへ引き渡す |
| `lib/showErrorImage.ts` | 共通エラー表示ユーティリティ。エラー画像を 3 秒表示し元の画像に戻す。フォールバックで `showAlert()` |
| `lib/__tests__/` | ライブラリのユニットテスト（vitest） |

### `com.hrk-m.kot-punch.sdPlugin/`

| パス | 責務 |
|------|------|
| `manifest.json` | プラグインメタデータ・アクション定義（UUID, アイコン, OS 要件） |
| `imgs/` | アイコン画像（通常 + @2x） |
| `ui/` | Property Inspector HTML（sdpi-components 使用）。設定項目がない場合は空 body でよい |
| `bin/` | ビルド成果物（gitignore 対象） |
| `logs/` | ランタイムログ（gitignore 対象） |

---

## アクション実装パターン

新しいアクションを追加するときは以下の順に実装する：

1. `src/actions/<name>.ts` に `SingletonAction<Settings>` 継承クラスを作成
2. `@action({ UUID: "com.hrk-m.kot-punch.<name>" })` デコレータを付与
3. `src/plugin.ts` で `streamDeck.actions.registerAction()` に登録
4. `manifest.template.json` の `Actions` 配列に UUID・アイコン・Controllers を追記し `bun run generate-manifest` で再生成
5. `com.hrk-m.kot-punch.sdPlugin/ui/<name>.html` に Property Inspector を追加（必要な場合）

### エラー表示パターン

エラー発生時は `showErrorImage(ev.action)` を fire-and-forget で呼ぶ（内部でエラー画像表示 → 3 秒後リセット。`setImage` 失敗時は `showAlert()` にフォールバック）。

```typescript
} catch {
    void showErrorImage(ev.action);
}
```

### SDK ライフサイクルの使い分け

| イベント | 用途 |
|----------|------|
| `onWillAppear` | ボタン表示時の初期タイトル・状態設定 |
| `onKeyUp` | キー離し時のメイン処理。`_isProcessing` ガードで連打を防止し、State 0/1 を切り替えてアクションを実行する |
| `setSettings` / `getSettings` | アクション設定の永続化 |
| `setTitle` | ボタン上のテキスト更新 |

> **注意**: `onKeyUp` はキー（ボタン）専用イベント。ダイアル・タッチスクリーンには `onDialUp` を使う。

#### Multi-Action での状態制御

マルチアクション内では `ev.payload.isInMultiAction` が `true` になり、`ev.payload.userDesiredState` で目的の状態インデックス（0 or 1）を取得できる。

---

## テスト戦略

- `@elgato/streamdeck` は Stream Deck プロセスへの接続が必要なため、ユニットテストでは `vi.mock` で差し替える
- `ev.action`（`setTitle`, `setSettings`）は `vi.fn()` でスタブ化して検証する
- `onKeyUp` ハンドラは `_isProcessing` フラグで連打を防止しているため、テストでは非同期処理の完了を `await` してから状態を検証する
- テストフレームワーク: vitest
