# Architecture: KOT Punch

## ビルドフロー

```
manifest.template.json
  └─ scripts/generate-manifest.mjs
       │
       ▼
  com.hrk-m.kot-punch.sdPlugin/manifest.json

src/plugin.ts
  └─ Rollup (TypeScript → 単一 ESM bundle + terser)
       │
       ▼
  com.hrk-m.kot-punch.sdPlugin/bin/plugin.js
  com.hrk-m.kot-punch.sdPlugin/bin/package.json

com.hrk-m.kot-punch.sdPlugin/package.json
  └─ bun install --production --cwd com.hrk-m.kot-punch.sdPlugin
       │
       ▼
  com.hrk-m.kot-punch.sdPlugin/node_modules/
```

`bun run build` は manifest をテンプレートから再生成してから、`src/plugin.ts` を minify 済みの単一 ESM bundle にまとめる。Rollup では `puppeteer` と `node-notifier` を external に残すため、最後に `com.hrk-m.kot-punch.sdPlugin/package.json` へ production dependency をインストールしてランタイム依存を補完する。

---

## ディレクトリ責務

### `src/`

| パス | 責務 |
|------|------|
| `plugin.ts` | エントリポイント。アクション登録と `streamDeck.connect()` のみ記述 |
| `actions/` | `SingletonAction<Settings>` を継承したアクションクラス群 |
| `actions/__tests__/` | アクションのユニットテスト（vitest） |
| `lib/settings.ts` | Global Settings 読み書きヘルパー。`KotPunchSettings` 型定義（`kotPunchUrl` / `kotPunchKey` / `kotPunchToken` / `kotPunchUsername` / `kotPunchPassword` / `kotPunchDryRun`）および `RequestSettings` 型定義（`requestUrl` / `requestUsername` / `requestPassword`）・`getGlobalSettings()` / `getRequestSettings()` / `hasRequiredSettings()` / `hasRequiredPunchSettings()` / `hasRequiredRequestSettings()` を提供 |
| `lib/puppeteer.ts` | `punchKot(selector, settings)` / `openKotPage(settings)` / `openRequestPage(settings)` 関数。Puppeteer で Chrome を起動し必要な認証情報を適用。`punchKot` は打刻ボタンクリック・ユーザー選択・パスワード入力・submit まで実行し、ユーザー選択用の CSS 属性セレクタでは `"` と `\` をエスケープする（`kotPunchDryRun` 時は submit スキップ）。`openKotPage` / `openRequestPage` は認証後に `disconnect()` でユーザーへ引き渡す |
| `lib/showErrorImage.ts` | 共通エラー表示ユーティリティ。エラー画像を 3 秒表示し元の画像に戻す。フォールバックで `showAlert()` |
| `lib/notify.ts` | macOS 通知ユーティリティ。`notify(message)` を呼ぶと `node-notifier` 経由で通知センターに表示。`sender: "com.elgato.StreamDeck"` を設定して Stream Deck アプリからの通知として扱う。`streamDeck.logger.createScope("notify")` でロガーを生成し、エラーは `logger.warn` / `logger.error` に留め、呼び出し元に伝播しない |
| `lib/logger.ts` | Stream Deck SDK の scoped logger ラッパー。未接続やテスト環境では no-op logger を返し、アクション/ライブラリから同じ API で安全にログ出力できるようにする |
| `lib/__tests__/` | ライブラリのユニットテスト（vitest） |

### リポジトリルート

| パス | 責務 |
|------|------|
| `manifest.template.json` | プラグイン manifest のテンプレート兼 source of truth。各アクション定義と表示名をそのまま保持する |
| `scripts/generate-manifest.mjs` | `manifest.template.json` を `com.hrk-m.kot-punch.sdPlugin/manifest.json` へコピーする生成スクリプト。CLI からの実行に加えて `generateManifest(rootDir)` を export し、テンポラリディレクトリを使う unit test からも再利用できる |
| `rollup.config.mjs` | plugin bundle の出力設定。単一ファイル化、minify、external 依存の維持、`bin/package.json` の emit を担当 |

### `com.hrk-m.kot-punch.sdPlugin/`

| パス | 責務 |
|------|------|
| `manifest.json` | 生成物のプラグインメタデータ・アクション定義（UUID, アイコン, OS 要件）。`manifest.template.json` から再生成するため手編集しない |
| `package.json` | plugin 配布物に同梱する production dependency 定義。external にした `puppeteer` / `node-notifier` を解決する |
| `imgs/` | アイコン画像（通常 + @2x） |
| `ui/` | Property Inspector HTML（sdpi-components 使用）。設定項目がない場合は空 body でよい |
| `bin/` | ビルド成果物（`plugin.js` と `package.json`）。gitignore 対象 |
| `logs/` | ランタイムログ（gitignore 対象） |

---

## アクション実装パターン

新しいアクションを追加するときは以下の順に実装する：

1. `src/actions/<name>.ts` に `SingletonAction<Settings>` 継承クラスを作成
2. `@action({ UUID: "com.hrk-m.kot-punch.<name>" })` デコレータを付与
3. `src/plugin.ts` で `streamDeck.actions.registerAction()` に登録
4. `manifest.template.json` の `Actions` 配列を更新し `bun run generate-manifest` で `manifest.json` を再生成
5. `com.hrk-m.kot-punch.sdPlugin/ui/<name>.html` に Property Inspector を追加（必要な場合）

### エラー表示パターン

エラー発生時は `showErrorImage(ev.action)` を fire-and-forget で呼ぶ（内部でエラー画像表示 → 3 秒後リセット。`setImage` 失敗時は `showAlert()` にフォールバック）。

```typescript
} catch {
    void showErrorImage(ev.action);
}
```

### 現行 SDK 利用パターン

| API / イベント | 用途 |
|----------------|------|
| `onKeyUp` | 現行 4 アクションのメイン処理入口。`_isProcessing` ガードを入れて二重実行を防ぐ |
| `streamDeck.settings.getGlobalSettings()` | 全アクション共通の Global Settings を取得する。KOT 系と申請画面系で型だけ切り替える |
| `ev.action.showAlert()` / `ev.action.showOk()` | 設定不足時の警告、打刻成功時の即時フィードバック |
| `ev.action.setState()` | Clock In / Clock Out のみ使用。State 0/1 を切り替えて当日打刻済みの見た目を表現する |

> **注意**: 現行実装はすべて Keypad 向けで、ダイアル・タッチスクリーン用イベントは使っていない。

### Multi-Action の扱い

Stream Deck SDK には `ev.payload.isInMultiAction` / `ev.payload.userDesiredState` があるが、現行の `clock-in` / `clock-out` は `manifest.template.json` で `SupportedInMultiActions: false` を明示しており、状態付き打刻ボタンは単体キー押下のみを前提にしている。

### Property Inspector パターン

- 現行の `ui/*.html` はすべて `global setting` のみを扱い、アクション個別設定は持たない
- `clock-in.html` / `clock-out.html` は同じ KOT 打刻設定セットを共有し、差分は表示文言のみ
- `open-kot.html` は KOT 認証に必要な最小 3 項目だけを露出する
- `open-request.html` は申請画面ログイン専用の URL / ユーザー ID / パスワードだけを扱う

### ログ出力パターン

各 action / library は `lib/logger.ts` の scoped logger を使う。ログ出力先は `com.hrk-m.kot-punch.sdPlugin/logs/` 配下で、SDK logger が使えない環境では no-op にフォールバックしてテストやローカル読み込みを壊さない。

---

## テスト戦略

- `@elgato/streamdeck` は Stream Deck プロセスへの接続が必要なため、ユニットテストでは `vi.mock` で差し替える
- `ev.action`（`setTitle`, `setSettings`）は `vi.fn()` でスタブ化して検証する
- `onKeyUp` ハンドラは `_isProcessing` フラグで連打を防止しているため、テストでは非同期処理の完了を `await` してから状態を検証する
- manifest 生成は `src/lib/__tests__/manifest.test.ts` で回帰テストする。`manifest.template.json` だけを置いたテンポラリディレクトリに対して `generateManifest(rootDir)` を実行し、`labels.json` なしで成立することを固定する
- テストフレームワーク: vitest
