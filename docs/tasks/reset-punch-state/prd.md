# PRD: reset-punch-state

## 概要

出勤（Clock In）と退勤（Clock Out）の打刻状態を一括で未打刻（State 0）に戻す「リセット」ボタンを追加する。

**背景**: 打刻ボタンの State は 2 秒長押しで個別にリセットできるが、出勤・退勤を一括でリセットしたいユースケースがある。

---

## ユーザーストーリー

- ユーザーとして、リセットボタンを 1 回押すだけで出勤・退勤両方の打刻済み表示を未打刻に戻せる

---

## 機能要件

### 新規アクション: リセット

| 項目 | 値 |
|------|-----|
| アクション名 | `リセット` |
| UUID | `com.hrk-m.kot-punch.reset-punch-state` |
| State 数 | 1（単一 State。リセットボタン自体は状態変化しない） |
| Property Inspector | 不要（設定項目なし） |
| Multi-Action サポート | 有効（デフォルト） |

### 押下フロー（onKeyUp）

```
リセットボタンを押す（onKeyUp）
  │
  ├─ streamDeck.actions を走査
  │   └─ manifestId が clock-in / clock-out に一致する
  │       全インスタンスを列挙
  ├─ 各インスタンスに setState(0) を実行
  │   （出勤・退勤を同時に「未打刻」State 0 に戻す）
  ├─ notify("打刻状態(出勤/退勤)をリセットしました")
  └─ 処理完了
```

### 対象 UUID

| アクション | UUID |
|---|---|
| 出勤 | `com.hrk-m.kot-punch.clock-in` |
| 退勤 | `com.hrk-m.kot-punch.clock-out` |

### エラー処理

| エラー条件 | 対応 |
|---|---|
| setState(0) が失敗（ボタンが未配置など） | エラーをログ出力し、残りのボタンへの処理は続行する |

---

## アイコン仕様

| ファイル | 用途 |
|----------|------|
| `imgs/actions/reset-punch-state/key.png` | Stream Deck ボタン表示（通常解像度） |
| `imgs/actions/reset-punch-state/key@2x.png` | Stream Deck ボタン表示（Retina） |
| `imgs/actions/reset-punch-state/icon.png` | アクションピッカー表示（通常解像度） |
| `imgs/actions/reset-punch-state/icon@2x.png` | アクションピッカー表示（Retina） |

素材: ユーザー提供の「リセット」画像（緑のリサイクルアロー＋スマイル＋「リセット」文字）を配置する。
ディレクトリ `imgs/actions/reset-punch-state/` は作成済み。

---

## 推奨レイアウト

Stream Deck 上での推奨配置（ユーザーが手動で設定）:

```
┌──────────────────┐
│   [リセット]      │  ← 新規（出勤の上）
├──────────────────┤
│   [出勤]         │  ← 既存 Clock In
├──────────────────┤
│   [退勤]         │  ← 既存 Clock Out
└──────────────────┘
```

---

## 実装方針

- `src/actions/reset-punch-state.ts` に `SingletonAction` 継承クラスを作成する
- `streamDeck.actions` をインポートして UUID フィルタで走査する（他アクションへの参照は持たない）
- `BasePunchAction` は継承しない（打刻処理なし）
- `_isProcessing` フラグは不要（単純な setState のみ）
- `manifest.template.json` に新アクション定義を追加し `bun run generate-manifest` を実行する
- Property Inspector HTML は不要

---

## 完了条件

- [ ] リセットボタンを押すと Clock In / Clock Out の全インスタンスが State 0 に戻る
- [ ] macOS 通知「打刻状態(出勤/退勤)をリセットしました」が表示される
- [ ] リセットボタン自体の State は変化しない
- [ ] `bun run lint && bun run test && bunx tsc --noEmit && bun run build` がすべて通る
- [ ] アイコン画像が配置されている
