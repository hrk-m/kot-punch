# Tasks: headless-mode-toggle

## Phase 1: Impact and Change Analysis

### Phase 1.1: 関連実装を調査する

- [ ] `src/platform/streamdeck/settings/punch-settings.ts` を読み、`KotPunchSettings` 型の現行定義を確認する
- [ ] `src/services/kot/auth.ts` を読み、`puppeteer.launch()` のオプション構造を確認する
- [ ] `com.hrk-m.kot-punch.sdPlugin/ui/clock-in.html` / `clock-out.html` を読み、`sdpi-components` の既存コンポーネントパターンを確認する
- [ ] `src/services/kot/__tests__/auth.test.ts` を読み、`puppeteer.launch` のモック方法を確認する
- [ ]* 全体コードを俯瞰する（任意）

### Phase 1.2: 変更候補を特定する

- [ ] 以下の変更ファイルと変更理由を確認する:

  | ファイル | 変更理由 |
  |---|---|
  | `src/platform/streamdeck/settings/punch-settings.ts` | `KotPunchSettings` に `kotPunchHeadless?: boolean` を追加する |
  | `src/services/kot/auth.ts` | `puppeteer.launch({ headless: false })` を `settings.kotPunchHeadless ?? false` に変更する |
  | `com.hrk-m.kot-punch.sdPlugin/ui/clock-in.html` | ヘッドレストグル用 `sdpi-checkbox` を追加する |
  | `com.hrk-m.kot-punch.sdPlugin/ui/clock-out.html` | ヘッドレストグル用 `sdpi-checkbox` を追加する（clock-in.html と同一 setting キーを使用） |
  | `src/services/kot/__tests__/auth.test.ts` | headless on/off/未設定 の 3 ケースをユニットテストで追加する |

- [ ] `docs/spec/punch.md` の「ボタン・アイコン一覧」と「依存関係」に変更が不要であることを確認する（UI/icon への影響なし）
- [ ] **CHECKPOINT**: 変更対象 5 ファイルと影響範囲（出勤・退勤打刻のみ、Open KOT / Open Request への影響なし）が明確

---

## Phase 2: Mock Empty-State Baseline

### Phase 2.1: モック契約を固定する

**`**MOCK-CONTRACT**`**:

```typescript
// KotPunchSettings の型拡張
type KotPunchSettings = {
    // 既存フィールド（変更なし）
    kotPunchUrl?: string;
    kotPunchKey?: string;
    kotPunchToken?: string;
    kotPunchUsername?: string;
    kotPunchPassword?: string;
    // 新規追加
    kotPunchHeadless?: boolean;  // true=ヘッドレス, false/undefined=ブラウザ表示
};

// auth.ts の launch 呼び出しシグネチャ（変更後）
puppeteer.launch({
    headless: settings.kotPunchHeadless ?? false,  // デフォルト: false（ブラウザ表示）
    defaultViewport: null,
    args: ["--start-maximized"],
});
```

- [ ] `KotPunchSettings` に `kotPunchHeadless?: boolean` を追加し、型定義を確定する

### Phase 2.2: 空モックで全体を成立させる

- [ ] `com.hrk-m.kot-punch.sdPlugin/ui/clock-in.html` に `sdpi-checkbox` を追加する:

  ```html
  <sdpi-item label="ヘッドレス">
      <sdpi-checkbox global setting="kotPunchHeadless">ON にすると打刻時にブラウザを非表示にする</sdpi-checkbox>
  </sdpi-item>
  ```

- [ ] `com.hrk-m.kot-punch.sdPlugin/ui/clock-out.html` に同一 `sdpi-checkbox` を追加する（`setting="kotPunchHeadless"` は同じグローバル設定キー）

- [ ] Stream Deck を再起動してチェックボックスが Property Inspector に表示されることを手動確認する

  > **確認観点**:
  > - 出勤・退勤 どちらの PI にもチェックボックスが表示されること
  > - 一方で ON にすると、もう一方でも ON が反映されていること（グローバル設定の共有確認）
  > - チェックあり/なしの状態が次回 PI 開き直し後も保持されること

- [ ] **`**MOCK-IMPL**`**: `auth.test.ts` に headless 設定の検証テストを追加する（Puppeteer 実起動なし）:

  ```typescript
  // 追加テストケース（例）
  describe("openAuthenticatedKotPage の headless オプション", () => {
      it("kotPunchHeadless=true のとき launch が { headless: true } で呼ばれる", async () => {
          // ...
      });
      it("kotPunchHeadless=false のとき launch が { headless: false } で呼ばれる", async () => {
          // ...
      });
      it("kotPunchHeadless が未設定のとき launch が { headless: false } で呼ばれる", async () => {
          // ...
      });
  });
  ```

- [ ] `bun run test` で既存テストがすべてパスし、追加テストも通ることを確認する

- [ ] **CHECKPOINT**: 実 Puppeteer 起動なし + モックで headless オプションの分岐が end-to-end で検証可能

---

## Phase 3: Progressive Fill-In from Critical Paths

### Phase 3.1: 穴埋め対象を優先度付けする

- [ ] Phase 2 で成立させたモックと型契約を元に、残り作業を確認する:

  | 作業 | 優先度 | 理由 |
  |---|---|---|
  | `auth.ts` の `headless` オプション動的化 | 高 | 中核ロジック。これがないと機能しない |
  | `sdpi-checkbox` の boolean/string 問題の検証 | 中 | 実挙動でのみ確認できるリスク |
  | 型チェック・lint の通過確認 | 高 | リリース前提条件 |

### Phase 3.2: 重要処理から穴埋めする

- [ ] `src/services/kot/auth.ts` の `puppeteer.launch()` を変更する:

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

- [ ] `bun run lint && bun run test && bunx tsc --noEmit && bun run build` を実行してすべてパスすることを確認する

- [ ] 手動動作確認:

  | 操作前提 | 操作 | 期待結果 |
  |---|---|---|
  | ヘッドレス: OFF | 出勤ボタンを押す | ブラウザウィンドウが開き、打刻完了後に閉じる（従来どおり） |
  | ヘッドレス: ON | 出勤ボタンを押す | ブラウザが画面に表示されないまま打刻が完了し、macOS 通知が届く |
  | ヘッドレス: ON | 退勤ボタンを押す | ブラウザが画面に表示されないまま打刻が完了し、macOS 通知が届く |
  | ヘッドレス: ON | 打刻失敗（認証エラー）が発生する | ブラウザが非表示のまま `showErrorImage()` が動作する |

- [ ] **`**INTEGRATION-LATER**`**: 以下は今回スコープ外として分離する:
  - Open KOT / Open Request の headless 化（常に可視モードのまま）
  - dryRun 時のヘッドレスモード対応（`KOT_PUNCH_DEBUG=true` との組み合わせ）
  - ウィンドウサイズ・位置の headless 非対応環境での挙動制御

- [ ] **CHECKPOINT**: ヘッドレス ON/OFF の主要ユースケースがモック + 実動作で再現可能
