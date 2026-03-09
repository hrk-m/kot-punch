# Tasks: 打刻セレクタ修正（punch-selector-fix）

> このタスクは実装済み。各チェックは完了状態を記録する。

---

## Phase 1: Impact and Change Analysis

### Phase 1.1: エラーログで根本原因を特定する

- [x] `bun run logs` でリアルタイムログを監視し、エラーメッセージを記録する
  - `No element found for selector: button[type=submit]`
  - `Waiting for selector 'button[type=submit]' failed`
  - `Node is either not clickable or not an Element`
- [x] エラーが `punchKot` 関数のどのステップで発生しているかをログから特定する

### Phase 1.2: 変更候補を特定する

- [x] 影響ファイルを列挙する

  | ファイル | 変更理由 |
  |---|---|
  | `src/lib/puppeteer.ts` | `punchKot` 内のセレクタ・操作順序が KOT DOM と不一致 |
  | `src/lib/__tests__/puppeteer.test.ts` | 新セレクタ・`waitForSelector` / `evaluate` モックに対応 |

- [x] 参照実装 `yuyakinjo/attend-kingoftime/src/punch-script.ts` と照合して正しいセレクタを確認する
- [x] **CHECKPOINT**: 変更対象ファイルと影響範囲が明確

---

## Phase 2: Mock Empty-State Baseline

> Puppeteer はユニットテストで `vi.mock("puppeteer")` により差し替え済み。
> この修正における「モック基盤」はテストファイルのモック拡張を指す。

### Phase 2.1: モック契約を固定する

**MOCK-CONTRACT**: `page` モックオブジェクトに追加が必要なメソッド

```typescript
// 修正前に不足していたメソッド
page.waitForSelector(selector: string): Promise<null>
page.evaluate(script: string): Promise<null>
```

- [x] `makePage()` に `waitForSelector` / `evaluate` を追加する（`puppeteer.test.ts`）
- [x] `resetMocks()` に `mockWaitForSelector` / `mockEvaluate` のリセット処理を追加する

### Phase 2.2: 空モックで全体を成立させる

**MOCK-IMPL**: `node:timers/promises` の `setTimeout` を `mockSleep` に差し替え

```typescript
vi.mock("node:timers/promises", () => ({
    setTimeout: mockSleep,
}));
```

- [x] `src/lib/puppeteer.ts` のインライン `wait` 関数を `import { setTimeout as sleep } from "node:timers/promises"` に置き換える
- [x] テスト内で `mockSleep` の呼び出し回数と引数をアサートできるようにする
- [x] **CHECKPOINT**: モックで `punchKot` の全ステップが end-to-end 実行可能

---

## Phase 3: Progressive Fill-In from Critical Paths

### Phase 3.1: 修正箇所を優先度付けする

| 優先度 | ステップ | 理由 |
|---|---|---|
| 高 | submit クリック方式の変更 | 直接の打刻失敗原因 |
| 高 | セレクタ修正（ユーザー・PW・submit） | 要素が見つからないエラーの原因 |
| 中 | `waitForSelector` + 500ms 待機の追加 | タイミング起因の "not clickable" 解消 |

### Phase 3.2: 重要処理から穴埋めする

#### submit クリック方式を変更する

- [x] `page.click("button[type=submit]")` + `waitForNavigation` を削除する
- [x] 500ms 待機 → `page.evaluate('document.querySelector("[type=submit]")?.click()')` → 1000ms 待機 に変更する
  - **操作前提**: パスワード入力完了済み
  - **操作**: JS から直接 submit ボタンをクリック
  - **期待結果**: "not clickable" エラーが発生しない・打刻が実行される

#### セレクタを修正する

- [x] ユーザー選択: `::-p-text(username)` → `[title*='username']` に変更する
  - `waitForSelector([value*='username'])` + 500ms 待機を追加
- [x] パスワード入力: `input[type=password]` → `.input_password` に変更する
  - `waitForSelector('#password_dialog')` + 500ms 待機を追加
- [x] 打刻ボタン: クリック前に `waitForSelector(selector)` を追加する

#### テストを新セレクタに対応させる

- [x] アサーションを新セレクタに更新する
  - `click([title*='username'])` / `waitForSelector('#attend')` 等
- [x] `mockSleep` の呼び出し順序・引数をテストに追加する
  - `(500, 500, 500, 1000)` の順
- [x] dryRun=true 時に `mockEvaluate` が呼ばれないことをアサートする
- [x] **CHECKPOINT**: 全 72 テスト通過・lint / 型チェック / ビルドすべて成功

---

## 検証コマンド

```bash
bun run lint && bun run test && bunx tsc --noEmit && bun run build
```

**INTEGRATION-LATER**: 実機（Stream Deck 接続時）での出勤・退勤打刻の動作確認
