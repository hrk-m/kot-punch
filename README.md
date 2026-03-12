# KOT Punch

Stream Deck から KING OF TIME を操作するプラグインです。

## 前提環境

- macOS
- Apple Silicon
- `bun` がインストール済み
- Stream Deck アプリがインストール済み

## 初回セットアップ

1. リポジトリ直下で依存関係をインストールする

```bash
bun install
```

`postinstall` で `bun run install-browser` が実行され、`Chrome for Testing` が未導入なら自動でインストールされます。

2. `.env` を作成する

```bash
cp .env.example .env
```

`.env` で dryRun モードを制御できる。

| 変数名 | 値 | 説明 |
|--------|----|------|
| `KOT_PUNCH_DEBUG` | `true` / `false` | `true` のとき submit をスキップし、パスワード入力後の状態でブラウザを切断する（動作確認用）。デフォルト: `false` |

**動作確認（submit をスキップしたい場合）**は `.env` の値を `true` に変更する。開発用の時に使用してください。

```
KOT_PUNCH_DEBUG=true
```

> 値はビルド時に確定する。変更後は再ビルドが必要。

3. プラグインをビルドする

```bash
bun run build
```

このコマンドで以下を順に実行します。

- `manifest.template.json` から `com.hrk-m.kot-punch.sdPlugin/manifest.json` を生成
- `src/plugin.ts` を `com.hrk-m.kot-punch.sdPlugin/bin/plugin.js` に bundle
- `com.hrk-m.kot-punch.sdPlugin/` 配下に production dependency を配置

4. 必要なら検証する

```bash
bun run lint
bun run typecheck
bun run test
```

## Chrome for Testing がずれたとき

次のようなエラーが出た場合は、`puppeteer` が要求する `Chrome for Testing` とローカル環境がずれています。

```text
Could not find Chrome (ver. ...)
```

対処手順:

1. 依存関係を lockfile に合わせて入れ直す

```bash
bun install
```

2. 必要な `Chrome for Testing` を確認し、未導入なら入れる

```bash
bun run install-browser
```

3. plugin 側の runtime dependency を揃え直す

```bash
bun run build
```

4. ログを確認して再実行する

```bash
bun run logs
```

補足:

- `postinstall` で `bun run install-browser` が走るため、通常は `bun install` だけで必要な browser が入ります
- `puppeteer` は version 固定しているため、Apple Silicon の Mac 同士であれば同じ `Chrome for Testing` revision を使います
- `bun run install-browser` は現在の `puppeteer` が要求する実行ファイルが見つからないときだけ install を実行します

## ドキュメント

### 機能要件

| ドキュメント | 内容 |
|---|---|
| [docs/spec.md](./docs/spec.md) | アプリ全体の機能要件・グローバル設定・アクション一覧 |
| [docs/spec/punch.md](./docs/spec/punch.md) | 打刻ボタン（Clock In / Clock Out）の詳細仕様 |
| [docs/spec/open-kot.md](./docs/spec/open-kot.md) | Open KOT（JWT 認証済みブラウザを開く）の詳細仕様 |
| [docs/spec/open-request.md](./docs/spec/open-request.md) | Open Request（申請画面を開く）の詳細仕様 |

### アーキテクチャ

| ドキュメント | 内容 |
|---|---|
| [docs/architecture.md](./docs/architecture.md) | ディレクトリ構成・実装責務・アクション実装パターン・テスト戦略 |

## 補足

- `Chrome for Testing` を手動で再確認したい場合は `bun run install-browser`
- ログ確認は `bun run logs`
