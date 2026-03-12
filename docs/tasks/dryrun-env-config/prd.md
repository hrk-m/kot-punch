# PRD: dryrun-env-config

## 1. Executive Summary

**Problem Statement**:
`kotPunchDryRun` は Stream Deck の Property Inspector（UI）のチェックボックスで管理されており、開発者が意図せず本番環境でも dryRun を有効にしたまま打刻してしまうリスクがある。また、UI 上でフラグを管理する必要がないため設定項目として不適切。

**Proposed Solution**:
Property Inspector のチェックボックスを廃止し、プロジェクトルートの `.env` ファイルに `KOT_PUNCH_DEBUG=true|false` を記述して管理する。Rollup ビルド時に値を inline 展開することで、runtime 依存（dotenv パッケージ等）を追加せず実現する。

**Success Criteria**:
- `.env` に `KOT_PUNCH_DEBUG=true` を設定してビルドすると dryRun が有効になる（submit スキップ）
- `.env` に `KOT_PUNCH_DEBUG=false` を設定してビルドすると dryRun が無効になる（本番打刻）
- `.env` 未設定（または `KOT_PUNCH_DEBUG` 未記載）のビルドはデフォルトで dryRun が無効になる（本番打刻）
- Property Inspector のチェックボックスが削除されている
- `KotPunchSettings` 型から `kotPunchDryRun` が削除されている
- `bun run lint && bun run test && bunx tsc --noEmit && bun run build` が全て pass する

---

## 2. User Experience & Functionality

### User Personas

- プラグイン開発者・運用者（自分自身）

### User Stories

1. **As a developer**, I want to set `KOT_PUNCH_DEBUG=true` in `.env` so that I can verify the punch flow without actually submitting.
2. **As a developer**, I want the dryRun flag to be removed from the Stream Deck UI so that end users cannot accidentally toggle it.

### Acceptance Criteria

- [ ] `.env.example` がプロジェクトルートに存在し `KOT_PUNCH_DEBUG=false` が記載されている
- [ ] `.gitignore` に `.env` が追加されている
- [ ] `clock-in.html` / `clock-out.html` から dryRun チェックボックスが削除されている
- [ ] `KotPunchSettings` 型に `kotPunchDryRun` が存在しない
- [ ] `punchKot()` が `process.env.KOT_PUNCH_DEBUG === "true"` を dryRun フラグとして使用している
- [ ] テストで `process.env.KOT_PUNCH_DEBUG` を設定することで dryRun 分岐をカバーできる

### Non-Goals

- dotenv パッケージの runtime 導入は行わない（Rollup build-time replace のみ）
- `requestSettings` や他の設定項目への変更は行わない
- `.env` の内容を UI に反映する機能は作らない

---

## 3. Technical Specifications

### Architecture Overview

```
.env (プロジェクトルート, gitignore 対象)
  KOT_PUNCH_DEBUG=true|false
          │
          │ bun run build 時に Bun が自動読み込み
          ↓
rollup.config.mjs (@rollup/plugin-replace)
  process.env.KOT_PUNCH_DEBUG → "true" or "false" に inline 展開
          │
          ↓
com.hrk-m.kot-punch.sdPlugin/bin/plugin.js
  const dryRun = "true" === "true"  // or "false" === "true"
```

### 変更ファイル一覧

| ファイル | 変更種別 | 変更内容 |
|---|---|---|
| `.env.example` | 新規作成 | `KOT_PUNCH_DEBUG=false` を記載（本番打刻がデフォルト） |
| `.gitignore` | 編集 | `.env` を追加 |
| `rollup.config.mjs` | 編集 | `@rollup/plugin-replace` を追加し `process.env.KOT_PUNCH_DEBUG` をビルド時に展開 |
| `src/platform/streamdeck/settings/punch-settings.ts` | 編集 | `KotPunchSettings` 型から `kotPunchDryRun?: boolean` を削除 |
| `src/services/kot/punch.ts` | 編集 | `settings.kotPunchDryRun` を `process.env.KOT_PUNCH_DEBUG === "true"` に置き換え |
| `com.hrk-m.kot-punch.sdPlugin/ui/clock-in.html` | 編集 | dryRun `<sdpi-item>` を削除 |
| `com.hrk-m.kot-punch.sdPlugin/ui/clock-out.html` | 編集 | dryRun `<sdpi-item>` を削除 |
| `src/services/kot/__tests__/punch.test.ts` | 編集 | `kotPunchDryRun` を `process.env.KOT_PUNCH_DEBUG` の設定・クリーンアップに変更 |
| `src/platform/streamdeck/settings/__tests__/punch-settings.test.ts` | 編集 | `kotPunchDryRun` 関連テストを削除 |

### Rollup replace の設定方針

```js
// rollup.config.mjs イメージ
import replace from "@rollup/plugin-replace";

replace({
  preventAssignment: true,
  values: {
    "process.env.KOT_PUNCH_DEBUG": JSON.stringify(process.env.KOT_PUNCH_DEBUG ?? "false"),
  },
})
```

`bun run build` 実行時に Bun がプロジェクトルートの `.env` を自動読み込みするため、Rollup config 内で `process.env.KOT_PUNCH_DEBUG` が参照可能になる。

### `punchKot` の変更方針

```ts
// 変更前
const { kotPunchDryRun = false } = settings;

// 変更後
const dryRun = process.env.KOT_PUNCH_DEBUG === "true";
```

### テスト変更方針

```ts
// dryRun テストでは process.env を設定・復元する
it("dryRun=true: submit がスキップされる", async () => {
  process.env.KOT_PUNCH_DEBUG = "true";
  try {
    await punchKot("#attend", settings);
    // assertions
  } finally {
    delete process.env.KOT_PUNCH_DEBUG;
  }
});
```

### Property Inspector の変更

`clock-in.html` / `clock-out.html` から以下の `<sdpi-item>` ブロックを削除する:

```html
<!-- 削除対象 -->
<sdpi-item label="テストモード（パスワード入力後のOKボタンスキップ）">
  <sdpi-checkbox global setting="kotPunchDryRun"></sdpi-checkbox>
</sdpi-item>
```

---

## 4. Risks & Roadmap

### Technical Risks

| リスク | 対策 |
|--------|------|
| ビルド時に `.env` が存在しない場合、`KOT_PUNCH_DEBUG` は `undefined` になる | `?? "false"` でデフォルト本番打刻を保証 |
| `@rollup/plugin-replace` の `preventAssignment: true` を忘れると警告が出る | PRD に明記して実装時に確認 |
| `punch.test.ts` で `process.env` をクリーンアップしないとテスト間で状態が汚染される | `try/finally` または `afterEach` で `delete process.env.KOT_PUNCH_DEBUG` を徹底 |

### Phased Rollout

- MVP のみ。段階リリースなし（1 PR で完結）
