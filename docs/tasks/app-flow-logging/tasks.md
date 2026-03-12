# Tasks: app-flow-logging

## Phase 1: Impact and Change Analysis

### Phase 1.1: 関連実装を調査する

- [ ] `src/lib/notify.ts` を読み、既存の `createScope("notify")` パターンを把握する
- [ ] `src/actions/clock-in.ts` / `clock-out.ts` / `open-kot.ts` / `open-request.ts` を読み、onKeyUp の処理フローを確認する
- [ ] `src/lib/puppeteer.ts` を読み、各関数のステップを確認する
- [ ]\* 全体コードを俯瞰する（初期フェーズではチェックを付けない）
- [ ] **CHECKPOINT**: 変更対象ファイルと影響範囲が明確

### Phase 1.2: 変更候補を特定する

| ファイル | 変更種別 | 変更理由 |
|---------|---------|---------|
| `src/lib/logger.ts` | **新規作成** | 全スコープを集約するロガーモジュール |
| `src/lib/notify.ts` | 修正 | `createScope("notify")` を `logger.notify` に置き換え |
| `src/actions/clock-in.ts` | 修正 | フローログを追加（onKeyUp 各ステップ） |
| `src/actions/clock-out.ts` | 修正 | フローログを追加（onKeyUp 各ステップ） |
| `src/actions/open-kot.ts` | 修正 | フローログを追加（onKeyUp 各ステップ） |
| `src/actions/open-request.ts` | 修正 | フローログを追加（onKeyUp 各ステップ） |
| `src/lib/puppeteer.ts` | 修正 | ブラウザ操作各ステップのログを追加 |

- [ ] 上記ファイル一覧を確認し、漏れがないことを確認する
- [ ] **CHECKPOINT**: 変更対象ファイルと影響範囲が明確

---

## Phase 2: Mock Empty-State Baseline

### Phase 2.1: モック契約を固定する（MOCK-CONTRACT）

**`**MOCK-CONTRACT**`**: `lib/logger.ts` のエクスポート契約

```ts
export const logger = {
  clockIn:     createScope("clock-in"),
  clockOut:    createScope("clock-out"),
  openKot:     createScope("open-kot"),
  openRequest: createScope("open-request"),
  puppeteer:   createScope("puppeteer"),
  notify:      createScope("notify"),
};
```

- `logger.{scope}.debug / .info / .warn / .error` の 4 メソッドを各モジュールが使う
- 機密情報（パスワード等）はログに含めない（PRD 非機能要件）
- テストは変更しない。`createScope` が失敗するモック環境では noop にフォールバック（try-catch）

- [ ] **CHECKPOINT**: ロガー契約が確定し、各モジュールの import パスが決定済み

### Phase 2.2: `lib/logger.ts` を作成して全体を成立させる（MOCK-IMPL）

**`**MOCK-IMPL**`**: `lib/logger.ts` 新規作成

- [ ] `src/lib/logger.ts` を作成し、上記契約通りのスコープを定義する
  - 成果物: `src/lib/logger.ts`
- [ ] `src/lib/notify.ts` の `streamDeck.logger.createScope("notify")` を `logger.notify` に置き換える
  - `import { logger } from "./logger"` を追加、直接 `createScope` の行を削除
  - 成果物: `src/lib/notify.ts`（動作は変わらない）
- [ ] `bunx tsc --noEmit` でコンパイルエラーがないことを確認する
- [ ] **CHECKPOINT**: `lib/logger.ts` が存在し、`notify.ts` が `logger.notify` を使う状態で型チェックが通る

---

## Phase 3: Progressive Fill-In from Critical Paths

### Phase 3.1: 穴埋め対象を優先度付けする

優先度（業務価値・失敗時の追跡重要度）:

| 優先度 | ファイル | 理由 |
|--------|---------|------|
| 高 | `puppeteer.ts` | ブラウザ操作の失敗原因特定に直結 |
| 高 | `clock-in.ts` / `clock-out.ts` | 打刻の主要ユースケース |
| 中 | `open-kot.ts` / `open-request.ts` | ページ表示系（影響は限定的） |

- [ ] 上記優先度を確認し、実装順序を決定する

### Phase 3.2: `puppeteer.ts` にフローログを追加する（優先度: 高）

- [ ] `import { logger } from "./logger"` を追加する
- [ ] `setupAuthenticatedPage` に以下を追加する:
  - ブラウザ起動前: `logger.puppeteer.debug("launching browser")`
  - 1st goto: `logger.puppeteer.debug("navigating to {url}")`（URL を文字列展開）
  - JWT トークンセット: `logger.puppeteer.debug("setting JWT token: {key}")`（キー名のみ、トークン値は含めない）
  - 2nd goto: `logger.puppeteer.debug("re-navigating for auth")`
  - 認証成功: `logger.puppeteer.debug("auth succeeded")`
  - 認証失敗: `logger.puppeteer.error("auth failed: dialog detected")`
- [ ] `punchKot` に以下を追加する:
  - 打刻ボタンクリック: `logger.puppeteer.info("clicking punch button: {selector}")`
  - ユーザー選択: `logger.puppeteer.debug("selecting user")`
  - パスワード入力: `logger.puppeteer.debug("typing password")`（パスワード値は含めない）
  - DryRun モード: `logger.puppeteer.info("dry-run mode, skipping submit")`
  - submit: `logger.puppeteer.info("submitting punch")`
  - 完了: `logger.puppeteer.info("punch completed")`
- [ ] `openRequestPage` に以下を追加する:
  - 処理開始: `logger.puppeteer.debug("opening request page")`
  - 完了: `logger.puppeteer.info("request page opened")`
- [ ] `openKotPage` に以下を追加する:
  - 完了: `logger.puppeteer.info("kot page opened")`
- [ ] 成果物: `src/lib/puppeteer.ts`（ロジック変更なし、ログ追加のみ）

### Phase 3.3: `clock-in.ts` / `clock-out.ts` にフローログを追加する（優先度: 高）

ユースケース（Clock In、Clock Out 共通）:
- 操作前提: Stream Deck ボタンが押された
- 操作: `onKeyUp` 受信
- 期待結果: 各ステップでログが出力される（ログ監視でフロー追跡可能）

- [ ] `clock-in.ts` に `import { logger } from "../lib/logger"` を追加する
- [ ] `clock-in.ts` の `onKeyUp` に以下を追加する:
  - メソッド先頭: `logger.clockIn.info("onKeyUp triggered")`
  - 処理中ガード hit: `logger.clockIn.debug("already processing, skipped")`
  - State 1 リセット: `logger.clockIn.debug("state reset to 0")`
  - 設定取得前: `logger.clockIn.debug("fetching settings")`
  - 必須設定不足: `logger.clockIn.warn("required settings missing")`
  - 打刻開始: `logger.clockIn.info("starting punch")`
  - 打刻成功: `logger.clockIn.info("punch succeeded")`
  - 打刻失敗（catch）: `logger.clockIn.error("punch failed: {error.message}")`
- [ ] `clock-out.ts` に同様のログを `logger.clockOut` スコープで追加する
- [ ] 成果物: `src/actions/clock-in.ts` / `src/actions/clock-out.ts`

### Phase 3.4: `open-kot.ts` / `open-request.ts` にフローログを追加する（優先度: 中）

- [ ] `open-kot.ts` に `import { logger } from "../lib/logger"` を追加する
- [ ] `open-kot.ts` の `onKeyUp` に以下を追加する:
  - メソッド先頭: `logger.openKot.info("onKeyUp triggered")`
  - 処理中ガード hit: `logger.openKot.debug("already processing, skipped")`
  - 設定取得前: `logger.openKot.debug("fetching settings")`
  - 必須設定不足: `logger.openKot.warn("required settings missing")`
  - ページ表示開始: `logger.openKot.info("opening page")`
  - ページ表示成功: `logger.openKot.info("page opened")`
  - 失敗（catch）: `logger.openKot.error("opening page failed: {error.message}")`
- [ ] `open-request.ts` に同様のログを `logger.openRequest` スコープで追加する
- [ ] 成果物: `src/actions/open-kot.ts` / `src/actions/open-request.ts`

### Phase 3.5: 品質確認

- [ ] `bun run lint` がパスすることを確認する
- [ ] `bun run test` がパスすることを確認する（テストは変更しない）
- [ ] `bunx tsc --noEmit` がパスすることを確認する
- [ ] `bun run build` がパスすることを確認する
- [ ] **CHECKPOINT**: 主要ユースケース（打刻フロー・ブラウザ操作）の各ステップがログで追跡可能

---

**`**INTEGRATION-LATER**`**: 以下は今回のスコープ外

- ログレベルのフィルタリング設定（Stream Deck の設定画面から変更可能にするなど）
- ログのファイル出力・外部サービス連携
- ログを使った打刻の監査ログ機能
