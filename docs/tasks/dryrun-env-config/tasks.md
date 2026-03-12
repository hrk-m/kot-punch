# Tasks: dryrun-env-config

> 合意済み事項
>
> - `kotPunchDryRun` を Property Inspector のチェックボックスから廃止し、プロジェクトルートの `.env` ファイルで管理する
> - ビルド時に Rollup `@rollup/plugin-replace` が `process.env.KOT_PUNCH_DRY_RUN` を inline 展開する
> - `KotPunchSettings` 型から `kotPunchDryRun` を削除する
> - dotenv パッケージの runtime 導入は行わない
> - Phase 2 CHECKPOINT 基準: `bun run build` 成功 + `bun run test` 全 pass + checkbox 削除済み

---

## Phase 1: Impact and Change Analysis

### Phase 1.1: 関連実装を調査する

- [x] `src/platform/streamdeck/settings/punch-settings.ts` を読み、`kotPunchDryRun` の型定義と利用箇所を確認する
- [x] `src/services/kot/punch.ts` を読み、`kotPunchDryRun` の参照方法を確認する
- [x] `com.hrk-m.kot-punch.sdPlugin/ui/clock-in.html` / `clock-out.html` を読み、dryRun checkbox の記述を確認する
- [x] `rollup.config.mjs` を読み、既存の plugins 構成を確認する
- [x] `src/services/kot/__tests__/punch.test.ts` を読み、`kotPunchDryRun` を使ったテストケースを洗い出す
- [x] `src/platform/streamdeck/settings/__tests__/punch-settings.test.ts` を読み、`kotPunchDryRun` 関連テストを確認する（なし）
- [x]* `src/actions/__tests__/clock-in.test.ts` / `clock-out.test.ts` を読み、`kotPunchDryRun` 参照の有無を確認する（なし）

### Phase 1.2: 変更候補を特定する

- [ ] 以下の変更対象ファイルと変更理由を確定する

| ファイル | 変更種別 | 変更理由 |
|---|---|---|
| `.env.example` | 新規作成 | `KOT_PUNCH_DRY_RUN=false` をサンプルとしてコミットする |
| `.gitignore` | 編集 | `.env` をトラッキング対象外にする |
| `rollup.config.mjs` | 編集 | `@rollup/plugin-replace` で `process.env.KOT_PUNCH_DRY_RUN` をビルド時に展開する |
| `src/platform/streamdeck/settings/punch-settings.ts` | 編集 | `KotPunchSettings` 型から `kotPunchDryRun?: boolean` を削除する |
| `src/services/kot/punch.ts` | 編集 | `settings.kotPunchDryRun` を `process.env.KOT_PUNCH_DRY_RUN === "true"` に置き換える |
| `com.hrk-m.kot-punch.sdPlugin/ui/clock-in.html` | 編集 | dryRun `<sdpi-item>` ブロックを削除する |
| `com.hrk-m.kot-punch.sdPlugin/ui/clock-out.html` | 編集 | dryRun `<sdpi-item>` ブロックを削除する |
| `src/services/kot/__tests__/punch.test.ts` | 編集 | `kotPunchDryRun` の settings 渡しを `process.env.KOT_PUNCH_DRY_RUN` の設定・クリーンアップに変更する |
| `src/platform/streamdeck/settings/__tests__/punch-settings.test.ts` | 編集 | `kotPunchDryRun` 関連テストケースを削除する |

- [x] **CHECKPOINT**: 変更対象ファイルと影響範囲が明確

---

## Phase 2: Mock Empty-State Baseline

### Phase 2.1: モック契約を固定する

**MOCK-CONTRACT** `process.env.KOT_PUNCH_DRY_RUN` の読み取り仕様を確定する

```
値 "true"  → dryRun 有効（submit スキップ、browser.disconnect()）
値 "false" → dryRun 無効（submit 実行、browser.close()）
未設定     → dryRun 無効（"false" 扱い = ?? "false" でデフォルト保証）
```

**MOCK-CONTRACT** Rollup replace の展開仕様を確定する

```js
// rollup.config.mjs に追加するプラグイン設定
import replace from "@rollup/plugin-replace";

replace({
  preventAssignment: true,
  values: {
    "process.env.KOT_PUNCH_DRY_RUN": JSON.stringify(
      process.env.KOT_PUNCH_DRY_RUN ?? "false"
    ),
  },
})
```

- `bun run build` 実行時、Bun がプロジェクトルートの `.env` を自動読み込みするため `process.env.KOT_PUNCH_DRY_RUN` がビルド変数として利用可能になる
- `@rollup/plugin-replace` が該当文字列をリテラル値に置き換えてバンドルする

### Phase 2.2: 実装する

- [x] `.env.example` を作成する（内容: `KOT_PUNCH_DRY_RUN=false`）
- [x] `.gitignore` に `.env` を追記する
- [x] `rollup.config.mjs` に `@rollup/plugin-replace` を追加する
  - `import replace from "@rollup/plugin-replace"` を追加
  - `plugins` 配列の先頭に `replace({ preventAssignment: true, values: { "process.env.KOT_PUNCH_DRY_RUN": JSON.stringify(process.env.KOT_PUNCH_DRY_RUN ?? "false") } })` を追加
- [x] `package.json` の devDependencies に `@rollup/plugin-replace` が存在するか確認し、なければ `bun add -D @rollup/plugin-replace` で追加する（v6.0.3 追加済み）
- [x] `src/platform/streamdeck/settings/punch-settings.ts` から `kotPunchDryRun?: boolean` を削除する
- [x] `src/services/kot/punch.ts` の `settings.kotPunchDryRun` を `process.env.KOT_PUNCH_DRY_RUN === "true"` に置き換える
  - 変数名は `dryRun` とし、`const dryRun = process.env.KOT_PUNCH_DRY_RUN === "true";` で宣言する
  - `settings` の分割代入から `kotPunchDryRun` を削除する
- [x] `com.hrk-m.kot-punch.sdPlugin/ui/clock-in.html` から dryRun の `<sdpi-item>` ブロックを削除する
- [x] `com.hrk-m.kot-punch.sdPlugin/ui/clock-out.html` から dryRun の `<sdpi-item>` ブロックを削除する
- [x] `bun run lint && bun run test && bunx tsc --noEmit && bun run build` を実行し、全て pass することを確認する
- [x] **CHECKPOINT**: `bun run build` 成功 + `bun run test` 全 pass + checkbox 削除済み

---

## Phase 3: Progressive Fill-In from Critical Paths

### Phase 3.1: テストを更新する

- [x] `src/services/kot/__tests__/punch.test.ts` の dryRun 関連テストを更新する

  **変更前** (settings 経由):
  ```ts
  await punchKot("#attend", { ...settings, kotPunchDryRun: true });
  ```

  **変更後** (process.env 経由):
  ```ts
  it("KOT_PUNCH_DRY_RUN=true: submit がスキップされる", async () => {
    process.env.KOT_PUNCH_DRY_RUN = "true";
    try {
      await punchKot("#attend", settings);
      // assertions
    } finally {
      delete process.env.KOT_PUNCH_DRY_RUN;
    }
  });
  ```

  | テスト観点 | 操作前提 | 操作 | 期待結果 |
  |-----------|---------|------|---------|
  | dryRun=true | `process.env.KOT_PUNCH_DRY_RUN = "true"` 設定済み | `punchKot("#attend", settings)` 呼び出し | `evaluate` 未呼び出し・`disconnect` 1 回・`close` 未呼び出し |
  | dryRun=false (デフォルト) | `KOT_PUNCH_DRY_RUN` 未設定 | `punchKot("#attend", settings)` 呼び出し | `evaluate` 1 回・`close` 1 回・`disconnect` 未呼び出し |
  | `#leave` + dryRun=true | `process.env.KOT_PUNCH_DRY_RUN = "true"` 設定済み | `punchKot("#leave", settings)` 呼び出し | `#leave` クリック・`disconnect` 1 回 |
  | エスケープ + dryRun=true | `process.env.KOT_PUNCH_DRY_RUN = "true"` 設定済み | 特殊文字ユーザー名で `punchKot` 呼び出し | CSS セレクタがエスケープされる |

- [x] `src/platform/streamdeck/settings/__tests__/punch-settings.test.ts` から `kotPunchDryRun` 関連のテストケースを削除する（対象テスト自体なし）
- [x] `bun run test` を再実行し、全テストが pass することを確認する（101 tests passed）
- [x] **CHECKPOINT**: 主要ユースケース（dryRun on/off・`#attend`/`#leave`・特殊文字）がテストで再現可能

### Phase 3.2: 最終検証

- [ ] `.env` を作成（または `.env.example` をコピー）し `KOT_PUNCH_DRY_RUN=true` を設定する
- [ ] `bun run build` を実行し、ビルドが成功することを確認する
- [ ] Stream Deck を再起動し、出勤・退勤ボタンの Property Inspector から「テストモード」チェックボックスが消えていることを目視確認する
- [ ] dryRun 確認後、`.env` の `KOT_PUNCH_DRY_RUN=false` に戻して再ビルドする
- [ ] `bun run lint && bun run test && bunx tsc --noEmit && bun run build` を実行し、最終確認する
- [ ] **CHECKPOINT**: 全テスト pass・型エラーゼロ・ビルド成功・UI から checkbox 不在

---

## INTEGRATION-LATER（今回スコープ外）

- `.env` の設定値を Stream Deck の Property Inspector に表示する（現在の dryRun 状態の可視化）
- `process.env.KOT_PUNCH_DRY_RUN` 以外の設定項目（URL 等）も `.env` 管理へ移行する
