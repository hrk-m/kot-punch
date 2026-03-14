# PRD: ヘッドレスモード切替（headless-mode-toggle）

## 1. Executive Summary

**Problem Statement**:
出勤・退勤打刻時に Puppeteer が起動するブラウザは常に可視状態（`headless: false`）でハードコードされており、バックグラウンドで静かに打刻したいユーザーが設定を変更できない。

**Proposed Solution**:
Property Inspector（出勤・退勤共通）にヘッドレスモードの on/off トグルを追加し、グローバル設定 `kotPunchHeadless` として保存する。ON 時はブラウザを非表示で起動し、OFF 時は現在と同じ可視モードで起動する。

**Success Criteria**:
- `kotPunchHeadless = true` のとき `puppeteer.launch({ headless: true })` でブラウザが非表示で起動すること
- `kotPunchHeadless = false` または未設定のとき `headless: false`（現在の動作）が維持されること
- 出勤・退勤どちらの Property Inspector で変更しても同じグローバル設定が反映されること
- 既存テストがすべてパスすること

---

## 2. User Experience & Functionality

### User Personas

- **メインユーザー**: Stream Deck でワンボタン打刻を使う会社員。毎日決まった時間に打刻するため、ブラウザウィンドウが前面に出てくることを煩わしいと感じている。

### User Stories

1. **As a** ユーザー, **I want to** Property Inspector のヘッドレストグルを ON にする **so that** 打刻時にブラウザが画面に出ず、作業を中断せずに済む。
2. **As a** ユーザー, **I want to** デフォルトで OFF（ブラウザ表示）のまま使える **so that** 設定を変更しなくても従来と同じ動作が継続される。

### Acceptance Criteria

**Story 1（ヘッドレス ON）**:
- [ ] Property Inspector に「ヘッドレス」トグル項目が表示される（出勤・退勤 両方）
- [ ] トグルを ON にした状態で打刻すると、ブラウザウィンドウが画面に表示されずに打刻が完了する
- [ ] 一方の PI（例: 出勤）で ON にすると、もう一方（退勤）でも ON が反映されている

**Story 2（デフォルト OFF）**:
- [ ] 初回インストール時・トグル未操作時は OFF（`headless: false`）として動作する
- [ ] `kotPunchHeadless` が `undefined` / `false` の場合、従来どおりブラウザが表示される

### Non-Goals

- Open KOT・Open Request のヘッドレス化は対象外（常にブラウザ表示のまま）
- `dryRun`（`KOT_PUNCH_DEBUG`）の挙動変更は対象外
- ヘッドレス OFF 時のウィンドウサイズや位置の制御は対象外

---

## 3. Technical Specifications

### 変更ファイル一覧

| ファイル | 変更内容 |
|---|---|
| `src/platform/streamdeck/settings/punch-settings.ts` | `KotPunchSettings` に `kotPunchHeadless?: boolean` を追加 |
| `src/services/kot/auth.ts` | `puppeteer.launch()` の `headless` オプションを `settings.kotPunchHeadless ?? false` に変更 |
| `com.hrk-m.kot-punch.sdPlugin/ui/clock-in.html` | ヘッドレストグル項目を追加 |
| `com.hrk-m.kot-punch.sdPlugin/ui/clock-out.html` | ヘッドレストグル項目を追加（clock-in.html と同じ設定キー） |

### Architecture Overview

```
Property Inspector（clock-in.html / clock-out.html）
  └─ sdpi-checkbox: global setting="kotPunchHeadless"
       │
       ▼
  Stream Deck Global Settings
  { ..., kotPunchHeadless: true | false | undefined }
       │
       ▼
  BasePunchAction.onKeyUp
  └─ getGlobalSettings() → KotPunchSettings
       │
       ▼
  punchKot(selector, settings)
  └─ openAuthenticatedKotPage(settings)
       └─ puppeteer.launch({
            headless: settings.kotPunchHeadless ?? false,
            defaultViewport: null,
            args: ["--start-maximized"],
          })
```

### Property Inspector 変更（UI モックアップ）

```
出勤 / 退勤 共通 Property Inspector

┌─────────────────────────────────────────┐
│ 打刻URL:     [ https://...            ] │
│ トークン名:  [ htjwt_xxxx            ] │
│ トークン値:  [ ••••••••••            ] │
│ ユーザー名:  [ 宮城 暖季              ] │
│ パスワード:  [ ••••••••••            ] │
│                                         │
│ ヘッドレス:  [□] ON にすると打刻時に  │  ← NEW
│              ブラウザを非表示にする     │
└─────────────────────────────────────────┘
```

- コンポーネント: `<sdpi-checkbox global setting="kotPunchHeadless">`
- チェックあり = `true`（ヘッドレス ON）
- チェックなし = `false`（ヘッドレス OFF、デフォルト）

### 設定型定義の変更

```typescript
// Before
export type KotPunchSettings = {
    kotPunchUrl?: string;
    kotPunchKey?: string;
    kotPunchToken?: string;
    kotPunchUsername?: string;
    kotPunchPassword?: string;
};

// After
export type KotPunchSettings = {
    kotPunchUrl?: string;
    kotPunchKey?: string;
    kotPunchToken?: string;
    kotPunchUsername?: string;
    kotPunchPassword?: string;
    kotPunchHeadless?: boolean;  // NEW: true=ヘッドレス, false/未設定=ブラウザ表示
};
```

### auth.ts の変更

```typescript
// Before
browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ["--start-maximized"],
});

// After
browser = await puppeteer.launch({
    headless: settings.kotPunchHeadless ?? false,
    defaultViewport: null,
    args: ["--start-maximized"],
});
```

`openAuthenticatedKotPage(settings)` の引数はすでに `KotPunchSettings` を受け取っているため、シグネチャ変更は不要。

### Security & Privacy

- `kotPunchHeadless` は boolean 値のみ。機密情報を含まない。

---

## 4. テスト方針

- `src/services/kot/__tests__/auth.test.ts` に以下のケースを追加する:
  - `kotPunchHeadless: true` のとき `puppeteer.launch` が `{ headless: true, ... }` で呼ばれること
  - `kotPunchHeadless: false` のとき `{ headless: false, ... }` で呼ばれること
  - `kotPunchHeadless` が未設定（`undefined`）のとき `{ headless: false, ... }` で呼ばれること（デフォルト確認）
- 既存の打刻フローテスト（`clock-in.test.ts` / `clock-out.test.ts`）への影響がないことを確認する

---

## 5. Risks & Roadmap

### MVP（このタスクのスコープ）

- `KotPunchSettings` への `kotPunchHeadless` 追加
- `auth.ts` の `headless` オプション動的化
- `clock-in.html` / `clock-out.html` へのトグル追加
- `auth.test.ts` へのテストケース追加

### Technical Risks

| リスク | 対応 |
|---|---|
| `headless: true` 時に `--start-maximized` が無視される（headless ではウィンドウが存在しないため） | 動作上の問題はなし。headless モード時は `args` の `--start-maximized` は無視されるが副作用はない |
| `sdpi-checkbox` の global 設定が boolean ではなく文字列 `"true"/"false"` として保存される可能性 | `settings.kotPunchHeadless === true` の厳密比較ではなく `settings.kotPunchHeadless ?? false` の truthy 評価を使う。または `String(settings.kotPunchHeadless) === "true"` での対応を検討 |
