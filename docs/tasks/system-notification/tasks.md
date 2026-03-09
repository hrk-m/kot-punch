# Tasks: system-notification

## Phase 1: Impact and Change Analysis

### Phase 1.1: 関連実装を調査する

- [x] 既存アクション 4 ファイル（`src/actions/clock-in.ts` / `clock-out.ts` / `open-kot.ts` / `open-request.ts`）の成功パスを読み、通知を挿入する位置を確認する
- [x] `src/lib/` 配下のユーティリティ実装パターン（`showErrorImage.ts`）を読み、`notify.ts` の設計に反映する
- [x] `package.json` を確認し、`node-notifier` / `@types/node-notifier` が未追加であることを確認する
- [x]\* `bun run test` を実行して現状のテスト全パスを確認する（初期フェーズでは完了チェック不要）

### Phase 1.2: 変更候補を特定する

- [x] 以下の変更候補ファイルを列挙し、変更理由を確認する

| ファイル | 変更種別 | 変更理由 |
|---|---|---|
| `src/lib/notify.ts` | 新規作成 | `node-notifier` を薄くラップした共通通知ユーティリティ |
| `src/lib/__tests__/notify.test.ts` | 新規作成 | `notify()` のユニットテスト（`node-notifier` をモック化） |
| `src/actions/clock-in.ts` | 変更 | 成功後に `void notify("出勤打刻が完了しました")` を追加 |
| `src/actions/clock-out.ts` | 変更 | 成功後に `void notify("退勤打刻が完了しました")` を追加 |
| `src/actions/open-kot.ts` | 変更 | 成功後に `void notify("KING OF TIME を開きました")` を追加 |
| `src/actions/open-request.ts` | 変更 | 成功後に `void notify("申請画面を開きました")` を追加 |
| `package.json` | 変更 | `node-notifier` と `@types/node-notifier` を追加 |

- [x] **CHECKPOINT**: 変更対象ファイルと影響範囲が明確

---

## Phase 2: Mock Empty-State Baseline

### Phase 2.1: モック契約を固定する

- [x] **MOCK-CONTRACT** `lib/notify.ts` のインターフェースを定義する

```typescript
// 公開 API
export function notify(message: string): void;

// node-notifier の呼び出し形状
notifier.notify({ title: "KOT Punch", message: string });
```

- 通知失敗時はエラーを握りつぶす（fire-and-forget）
- `title` は `"KOT Punch"` 固定定数

### Phase 2.2: 空モックでテストが成立することを確認する

- [x] **MOCK-IMPL** `src/lib/__tests__/notify.test.ts` を新規作成し、`node-notifier` をモック化してテストが通ることを確認する

```typescript
// vi.mock('node-notifier') で node-notifier 全体をモック
// test: notify('出勤打刻が完了しました') を呼ぶと
//        notifier.notify が { title: 'KOT Punch', message: '出勤打刻が完了しました' } で呼ばれる
```

- [x] `bun run test` を実行してテストが通ることを確認する
- [x] **CHECKPOINT**: 実データなし（モック）でテスト end-to-end 実行可能

---

## Phase 3: Progressive Fill-In from Critical Paths

### Phase 3.1: 依存パッケージを追加する

- [x] `node-notifier` と型定義を追加する

```bash
bun add node-notifier
bun add -d @types/node-notifier
```

- [x] `bun run build` でバンドルエラーが発生しないことを確認する

### Phase 3.2: `lib/notify.ts` を実装する

- [x] `src/lib/notify.ts` を新規作成する

```typescript
import notifier from "node-notifier";

const TITLE = "KOT Punch";

export function notify(message: string): void {
    notifier.notify({ title: TITLE, message });
}
```

- [x] `bun run test` ですべてのテストが通ることを確認する

### Phase 3.3: 各アクションへ通知を追加する

- [x] `src/actions/clock-in.ts` — `setState(1)` の直後に `void notify("出勤打刻が完了しました")` を追加する

  ```
  操作前提: Clock In が成功（punchKot 完了）
  操作: notify が呼ばれる（fire-and-forget）
  期待結果: macOS 通知センターに「出勤打刻が完了しました」が表示される
  ```

- [x] `src/actions/clock-out.ts` — `setState(1)` の直後に `void notify("退勤打刻が完了しました")` を追加する

  ```
  操作前提: Clock Out が成功（punchKot 完了）
  操作: notify が呼ばれる（fire-and-forget）
  期待結果: macOS 通知センターに「退勤打刻が完了しました」が表示される
  ```

- [x] `src/actions/open-kot.ts` — `openKotPage()` の直後に `void notify("KING OF TIME を開きました")` を追加する

  ```
  操作前提: openKotPage 完了（disconnect 済み）
  操作: notify が呼ばれる（fire-and-forget）
  期待結果: macOS 通知センターに「KING OF TIME を開きました」が表示される
  ```

- [x] `src/actions/open-request.ts` — `openRequestPage()` の直後に `void notify("申請画面を開きました")` を追加する

  ```
  操作前提: openRequestPage 完了（disconnect 済み）
  操作: notify が呼ばれる（fire-and-forget）
  期待結果: macOS 通知センターに「申請画面を開きました」が表示される
  ```

### Phase 3.4: 最終確認

- [x] `bun run lint && bun run test && bunx tsc --noEmit && bun run build` を実行してすべてパスすることを確認する
- [x] Stream Deck で実際に打刻・画面を開き、macOS 通知が表示されることを手動確認する（2026-03-09 通知表示確認。初回は macOS の通知許可ダイアログが表示される場合がある）
- [x] **CHECKPOINT**: 主要ユースケース 4 件がすべて通知付きで動作する（アクション単体テストで成功時 notify 呼び出し/失敗時非呼び出しを確認）

---

## INTEGRATION-LATER

- エラー時の macOS 通知（現在は `showErrorImage()` のみ）
- 通知クリック時のアクション（KOT を前面に出すなど）
- Windows / Linux 対応（現在は macOS 専用）
- 通知音・アイコンのカスタマイズ
