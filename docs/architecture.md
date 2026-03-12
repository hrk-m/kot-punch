# Architecture: KOT Punch

## ビルドフロー

```
manifest.template.json
  └─ scripts/generate-manifest.mts
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

開発環境の初期セットアップではルートの `bun install` が `postinstall` を通して `scripts/install-browser.mts` を実行し、Puppeteer が必要とする Chrome for Testing を不足時のみ補充する。

---

## ディレクトリ責務

### `src/`

| パス | 責務 |
|------|------|
| `plugin.ts` | エントリポイント。アクション登録と `streamDeck.connect()` のみ記述 |
| `actions/` | `SingletonAction<Settings>` を継承したアクションクラス群 |
| `actions/punch/base-punch-action.ts` | `ClockIn` / `ClockOut` 共通の処理（`_isProcessing` フラグ・長押し判定・`onKeyDown` / `onKeyUp`）をまとめた抽象基底クラス。`SingletonAction<KotPunchSettings>` を継承し、差分（`logger` / `selector` / `successMessage`）のみサブクラスで定義する |
| `actions/__tests__/` | アクションのユニットテスト（vitest） |
| `services/kot/` | KOT 操作のサービス層。`auth.ts`（認証済みページ起動・JWT クッキーセット・ダイアログ検出）/ `punch.ts`（打刻ボタンクリック・ユーザー選択・パスワード入力・submit）/ `open-kot.ts`（KOT 勤怠画面を開いて disconnect）/ `open-request.ts`（申請画面にログインして disconnect）の 4 ファイル |
| `services/kot/__tests__/` | サービス層のユニットテスト（vitest） |
| `platform/streamdeck/logger.ts` | Stream Deck SDK の scoped logger ラッパー。未接続やテスト環境では no-op logger を返し、アクション/サービスから同じ API で安全にログ出力できるようにする |
| `platform/streamdeck/show-error-image.ts` | 共通エラー表示ユーティリティ。エラー画像を 3 秒表示し元の画像に戻す。フォールバックで `showAlert()` |
| `platform/streamdeck/settings/punch-settings.ts` | `KotPunchSettings` 型定義（`kotPunchUrl` / `kotPunchKey` / `kotPunchToken` / `kotPunchUsername` / `kotPunchPassword` / `kotPunchDryRun`）・`getGlobalSettings()` / `hasRequiredSettings()` / `hasRequiredPunchSettings()` を提供 |
| `platform/streamdeck/settings/request-settings.ts` | `RequestSettings` 型定義（`requestUrl` / `requestUsername` / `requestPassword`）・`getRequestSettings()` / `hasRequiredRequestSettings()` を提供 |
| `platform/streamdeck/__tests__/` | Stream Deck プラットフォーム層のユニットテスト（vitest） |
| `platform/streamdeck/settings/__tests__/` | 設定ヘルパーのユニットテスト（vitest） |
| `platform/desktop/notify.ts` | macOS 通知ユーティリティ。`notify(message)` を呼ぶと `node-notifier` 経由で通知センターに表示。`sender: "com.elgato.StreamDeck"` を設定して Stream Deck アプリからの通知として扱う。エラーは呼び出し元に伝播しない |
| `platform/desktop/__tests__/` | デスクトップ層のユニットテスト（vitest） |
| `shared/long-press.ts` | 打刻ボタンの 2 秒長押し判定 helper。action instance ごとの `id` をキーに 2 秒タイマー、成立済みフラグ、解除処理を保持する `createPressTracker()` と `LONG_PRESS_THRESHOLD_MS` を提供 |
| `shared/__tests__/` | shared 層のユニットテスト（vitest） |
| `__tests__/` | リポジトリレベルのテスト。アーキテクチャ構造確認（`architecture.test.ts`）・manifest 生成回帰（`manifest.test.ts` / `manifest-template.test.ts`）・ランタイム依存バージョン固定（`runtime-dependencies.test.ts`） |

### リポジトリルート

| パス | 責務 |
|------|------|
| `manifest.template.json` | プラグイン manifest のテンプレート兼 source of truth。各アクション定義と表示名をそのまま保持する |
| `scripts/generate-manifest.mts` | `manifest.template.json` を `com.hrk-m.kot-punch.sdPlugin/manifest.json` へコピーする生成スクリプト。CLI からの実行に加えて `generateManifest(rootDir)` を export し、テンポラリディレクトリを使う unit test からも再利用できる |
| `scripts/install-browser.mts` | Puppeteer が管理する Chrome for Testing を自動インストールするスクリプト。`ensureChromeInstalled(rootDir)` をエクスポートし、実行ファイルが存在しない場合のみ `bunx puppeteer browsers install chrome` を実行する。`postinstall` フックで `bun install` 時に自動実行される |
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

1. `src/actions/<name>.ts` に `SingletonAction<Settings>` 継承クラスを作成（打刻系なら `BasePunchAction` を継承）
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
| `onKeyDown` | `clock-in` / `clock-out` のみ使用。`BasePunchAction` が `KeyDownEvent<KotPunchSettings>` を受け、2 秒タイマーを開始し、到達時点で `setState()` を即時実行する callback を登録する |
| `onKeyUp` | 現行 4 アクションのメイン処理入口。`clock-in` / `clock-out` では `BasePunchAction` が `KeyUpEvent<KotPunchSettings>` を受け、long-press tracker を解放し、成立済みなら no-op、未成立なら短押し打刻フローへ分岐する |
| `streamDeck.settings.getGlobalSettings()` | 全アクション共通の Global Settings を取得する。KOT 系と申請画面系で型だけ切り替える |
| `ev.action.showAlert()` / `ev.action.showOk()` | 設定不足時の警告、打刻成功時の即時フィードバック |
| `ev.action.setState()` | Clock In / Clock Out のみ使用。State 0/1 を切り替えて当日打刻済みの見た目を表現する |

> **注意**: 現行実装はすべて Keypad 向けで、ダイアル・タッチスクリーン用イベントは使っていない。

### Multi-Action の扱い

Stream Deck SDK には `ev.payload.isInMultiAction` / `ev.payload.userDesiredState` があるが、現行の `clock-in` / `clock-out` は `manifest.template.json` で `SupportedInMultiActions: false` を明示しており、状態付き打刻ボタンは単体キー押下のみを前提にしている。また、long-press で plugin 側が `setState()` を制御するため、同じ action 定義で `DisableAutomaticStates: true` も指定し、Stream Deck 側の自動 toggle と競合しないようにしている。

### Property Inspector パターン

- 現行の `ui/*.html` はすべて `global setting` のみを扱い、アクション個別設定は持たない
- `clock-in.html` / `clock-out.html` は同じ KOT 打刻設定セットを共有し、差分は表示文言のみ
- `open-kot.html` は KOT 認証に必要な最小 3 項目だけを露出する
- `open-request.html` は申請画面ログイン専用の URL / ユーザー ID / パスワードだけを扱う

### ログ出力パターン

各 action / service は `platform/streamdeck/logger.ts` の scoped logger を使う。ログ出力先は `com.hrk-m.kot-punch.sdPlugin/logs/` 配下で、SDK logger が使えない環境では no-op にフォールバックしてテストやローカル読み込みを壊さない。

---

## テスト戦略

- `@elgato/streamdeck` は Stream Deck プロセスへの接続が必要なため、ユニットテストでは `vi.mock` で差し替える
- `ev.action`（`setTitle`, `setSettings`）は `vi.fn()` でスタブ化して検証する
- `clock-in` / `clock-out` の長押し判定は `src/shared/__tests__/long-press.test.ts` で境界値（1999ms / 2000ms）、callback 発火、後始末を固定する
- `onKeyUp` ハンドラは `_isProcessing` フラグで連打を防止しているため、テストでは非同期処理の完了を `await` してから状態を検証する。長押し分岐は fake timer で「2000ms 到達時点で `setState()` が走ること」と「長押し成立後の `onKeyUp` が no-op であること」を再現する
- manifest 生成は `src/__tests__/manifest.test.ts` で回帰テストする。`manifest.template.json` だけを置いたテンポラリディレクトリに対して `generateManifest(rootDir)` を実行し、`labels.json` なしで成立することを固定する
- manifest template の action 定義は `src/__tests__/manifest-template.test.ts` で補完する。現行では `open-request` が `UserTitleEnabled: false` の image-only state を維持していることを固定する
- `src/platform/desktop/__tests__/notify.test.ts` では `node-notifier` をモックし、通知送信の callback error と同期例外が呼び出し元へ伝播しないことを固定する
- ランタイム依存バージョンは `src/__tests__/runtime-dependencies.test.ts` で固定する。`package.json`（ルート）と `com.hrk-m.kot-punch.sdPlugin/package.json` の `puppeteer` バージョンが完全一致し、かつ `generate-manifest` / `install-browser` / `postinstall` の各スクリプトが正しく定義されていることを検証する
- ディレクトリ構造の整合性は `src/__tests__/architecture.test.ts` で保証する。新ディレクトリ（`services/` / `platform/` / `shared/`）のファイル存在と旧 `lib/` ファイルの不在、TypeScript 相対 import に `.js` 拡張子が使われていないことを自動検証する
- `src/actions/punch/base-punch-action.typecheck.ts` で `BasePunchAction` の `SingletonAction<KotPunchSettings>` 継承と、`onKeyDown` / `onKeyUp` のイベント型が `KotPunchSettings` と一致することを型レベルで固定する
- テストフレームワーク: vitest
