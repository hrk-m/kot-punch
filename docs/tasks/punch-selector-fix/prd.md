# PRD: 打刻セレクタ修正（punch-selector-fix）

## 概要

Stream Deck の打刻ボタンを押すと `showAlert` が表示され打刻できなかった問題を修正する。
`src/lib/puppeteer.ts` の `punchKot` 関数内セレクタ・操作順序が KOT の実際の DOM と一致していなかったことが根本原因。

## 問題の経緯

### 発生エラー（ログ）

```
ERROR clock-in: punch failed: No element found for selector: button[type=submit]
ERROR clock-out: punch failed: Waiting for selector `button[type=submit]` failed
ERROR clock-out: punch failed: Node is either not clickable or not an Element
```

### 調査方法

- `bun run logs` でリアルタイムログを監視
- 参照実装 `yuyakinjo/attend-kingoftime` の `src/punch-script.ts` と照合してセレクタを特定

## 修正内容（punchKot 関数）

### セレクタ変更

| ステップ | 修正前 | 修正後 |
|---|---|---|
| 打刻ボタン待機 | なし | `waitForSelector(#attend / #leave)` |
| ユーザー選択待機 | なし | `waitForSelector([value*='username'])` |
| ユーザー選択クリック | `click(::-p-text(username))` | 500ms 待機 → `click([title*='username'])` |
| PW ダイアログ待機 | なし | `waitForSelector(#password_dialog)` |
| パスワード入力 | `type(input[type=password])` | 500ms 待機 → `type(.input_password)` |
| submit | `page.click(button[type=submit])` → `waitForNavigation` | 500ms 待機 → `page.evaluate('[type=submit]?.click()')` → 1000ms 待機 |

### submit を `page.evaluate` に変更した理由

`page.click()` では "Node is either not clickable or not an Element" エラーが発生する。
KOT の submit ボタンは Puppeteer の通常クリック判定を通過できない DOM 構造のため、
JavaScript から直接クリックする `page.evaluate` が必要。

### 操作フロー（修正後）

```
1. setupAuthenticatedPage（JWT 認証）
   ↓
2. waitForSelector(#attend / #leave)
3. click(#attend / #leave)
   ↓
4. waitForSelector([value*='username'])
5. 500ms 待機
6. click([title*='username'])
   ↓
7. waitForSelector(#password_dialog)
8. 500ms 待機
9. type(.input_password, password, { delay: 100 })
   ↓
10. [dryRun=true] → browser.disconnect() で終了
    [dryRun=false] →
      500ms 待機
      → page.evaluate('document.querySelector("[type=submit]")?.click()')
      → 1000ms 待機
      → browser.close()
```

## 影響範囲

| ファイル | 変更 |
|---|---|
| `src/lib/puppeteer.ts` | `punchKot` 関数のセレクタ・操作順序を修正 |
| `src/lib/__tests__/puppeteer.test.ts` | モックに `waitForSelector` / `evaluate` を追加、アサーションを新セレクタに更新 |

## テスト

```bash
bun run lint && bun run test && bunx tsc --noEmit && bun run build
```

- 全 72 テスト通過
- lint / 型チェック / ビルドすべて成功

## 参照

- 参照実装: `yuyakinjo/attend-kingoftime/src/punch-script.ts`
- 関連タスク: `attend-punch`, `leave-punch`
