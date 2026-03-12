# Tasks: reset-punch-state

prd: `docs/tasks/reset-punch-state/prd.md`

---

## Phase 1: Impact and Change Analysis

### Phase 1.1: 関連実装を調査する

- [x] `src/actions/` 配下の既存アクション実装パターンを読む（`open-kot.ts` / `open-request.ts` が最も近い）
- [x] `src/plugin.ts` のアクション登録パターンを確認する
- [x] `manifest.template.json` のアクション定義パターンを確認する
- [x] `platform/streamdeck/logger.ts` の scope 定義を確認する（新スコープが必要か）
- [ ]* 全体コードを俯瞰する（任意・後回し可）

### Phase 1.2: 変更候補を特定する

- [x] 以下のファイルに変更が必要なことを確認する:

| ファイル | 変更理由 |
|---|---|
| `src/actions/reset-punch-state.ts` | 新規アクションクラス（新規作成） |
| `src/plugin.ts` | `ResetPunchState` をアクション登録に追加 |
| `manifest.template.json` | `reset-punch-state` アクション定義を追加 |
| `src/platform/streamdeck/logger.ts` | `resetPunchState` スコープを追加 |
| `com.hrk-m.kot-punch.sdPlugin/imgs/actions/reset-punch-state/` | アイコン画像 4 ファイルを配置（ユーザー作業） |
| `com.hrk-m.kot-punch.sdPlugin/manifest.json` | `bun run generate-manifest` で自動生成 |

- [x] 共通化候補を確認する（なし: `BasePunchAction` は打刻処理専用のため継承しない）
- [x] **CHECKPOINT**: 変更対象ファイルと影響範囲が明確

---

## Phase 2: Mock Empty-State Baseline

### Phase 2.1: モック契約を固定する

- [x] **MOCK-CONTRACT** `src/actions/__tests__/reset-punch-state.test.ts` で使うモック型を定義する

```typescript
// テスト内モック設計
// streamDeck.actions: AsyncIterator を vi.mock で差し替え
// 返すアクション一覧:
//   { manifestId: "com.hrk-m.kot-punch.clock-in",  setState: vi.fn() }
//   { manifestId: "com.hrk-m.kot-punch.clock-out", setState: vi.fn() }
//   { manifestId: "com.hrk-m.kot-punch.open-kot",  setState: vi.fn() }
// notify: vi.mock("../platform/desktop/notify") で差し替え
```

### Phase 2.2: 空モックでアクションを成立させる

- [x] **MOCK-IMPL** `src/actions/reset-punch-state.ts` の空実装を作成する
  - `SingletonAction<Record<string, never>>` を継承する
  - `@action({ UUID: "com.hrk-m.kot-punch.reset-punch-state" })` を付与する
  - `onKeyUp` に `// TODO: implement` のみ記述する
- [x] `src/plugin.ts` に `ResetPunchState` を登録する
- [x] `manifest.template.json` に空実装用アクション定義を追加する（`States` は 1 つ、`UserTitleEnabled: false`）
- [x] `bun run generate-manifest` を実行して `manifest.json` を更新する
- [x] `bunx tsc --noEmit` でコンパイルエラーがないことを確認する
- [x] **CHECKPOINT**: 実データなし + 空実装でビルドが通る

---

## Phase 3: Progressive Fill-In from Critical Paths

### Phase 3.1: ロガースコープを追加する

- [x] `src/platform/streamdeck/logger.ts` に `resetPunchState` スコープを追加する
  - 既存の `clockIn` / `clockOut` スコープと同じパターンで追加する

### Phase 3.2: リセット処理を実装する

- [x] `src/actions/reset-punch-state.ts` の `onKeyUp` を実装する

  ```
  操作前提: clock-in / clock-out が両方とも State 1（打刻済み）
  操作: リセットボタンを短押しする（onKeyUp）
  期待結果:
    - streamDeck.actions を走査し clock-in / clock-out の全インスタンスに setState(0) が呼ばれる
    - notify("打刻状態(出勤/退勤)をリセットしました") が呼ばれる
    - open-kot / open-request の setState は呼ばれない
  ```

  実装方針:
  - `streamDeck.actions` を `for await...of` で走査する
  - `action.manifestId` で `clock-in` / `clock-out` をフィルタ
  - `setState(0)` を `try/catch` で囲み失敗時はログ出力して続行する
  - 全件処理後に `notify("打刻状態(出勤/退勤)をリセットしました")` を呼ぶ

### Phase 3.3: テストを実装する

- [x] `src/actions/__tests__/reset-punch-state.test.ts` を作成する

  **テストケース**:

  - [x] 正常系: clock-in / clock-out の全インスタンスに `setState(0)` が呼ばれる
  - [x] 正常系: `notify("打刻状態(出勤/退勤)をリセットしました")` が呼ばれる
  - [x] 対象外アクションは影響なし: open-kot / open-request の setState が呼ばれない
  - [x] setState 失敗時も残りを続行: 一部の setState が throw しても他のインスタンスへの処理が完走する

- [x] `bun run test` で全テストが通ることを確認する（106 tests passed）

### Phase 3.4: アイコン画像を配置する（ユーザー作業）

- [ ] 提供いただいた「リセット」画像（#1）を以下 4 ファイルとして配置する:
  - `com.hrk-m.kot-punch.sdPlugin/imgs/actions/reset-punch-state/key.png`
  - `com.hrk-m.kot-punch.sdPlugin/imgs/actions/reset-punch-state/key@2x.png`
  - `com.hrk-m.kot-punch.sdPlugin/imgs/actions/reset-punch-state/icon.png`
  - `com.hrk-m.kot-punch.sdPlugin/imgs/actions/reset-punch-state/icon@2x.png`

### Phase 3.5: 最終検証

- [x] `bun run lint && bun run test && bunx tsc --noEmit && bun run build` が全て通ることを確認する
- [ ] Stream Deck に「リセット」ボタンを追加し、出勤・退勤を State 1 にした後に押して State 0 に戻ることを確認する
- [ ] macOS 通知センターに「打刻状態(出勤/退勤)をリセットしました」が表示されることを確認する
- [ ] **CHECKPOINT**: 主要ユースケースが動作確認済み

---

**INTEGRATION-LATER**:
- なし（外部 API 連携なし。Stream Deck SDK の `streamDeck.actions` のみ使用）
