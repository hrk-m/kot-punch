# PRD: Countup Quintuple Multiplier

## 概要

Stream Deck の IncrementCounter アクションを改修し、ボタンを押すたびにカウント値が 5 倍になる動作に変更する。長押しリセット機能は既存のまま維持する。

## 対象ファイル

- `src/actions/increment-counter.ts`
- `src/actions/__tests__/increment-counter.test.ts`

---

## 機能要件

### 1. 短押し: 5 倍カウントアップ

| 押下回数 | 表示値 | 計算 |
|---------|--------|------|
| 初期表示 | 1      | -    |
| 1 回目   | 1      | 初回は 1 に設定 |
| 2 回目   | 5      | 1 × 5 |
| 3 回目   | 25     | 5 × 5 |
| 4 回目   | 125    | 25 × 5 |

- `count` が 0（初期状態）のとき: 押下で `count = 1` にセット
- `count` が 1 以上のとき: 押下で `count = count * 5`（3 倍から 5 倍へ変更）
- `setSettings` でカウント値を永続化
- `setTitle` でボタンに表示

### 2. 長押し: カウントリセット（変更なし）

- 長押し検出: `onKeyDown` でタイマー開始、`onKeyUp` でタイマーキャンセル
  - 長押し判定閾値: 500ms
- リセット後: `count = 1` にセット（次の短押しで 5 になる）
- リセット直後の表示: `1`
- `setSettings` と `setTitle` でリセット値を即座に反映

### 3. 初期表示（変更なし）

- `onWillAppear`: `count ?? 1` を表示（未設定時は `1`）

---

## ボタン状態遷移

```
[初期表示: 1]
     |
     | 短押し
     v
[カウント表示: 1 → 5 → 25 → 125 → ...]
     |
     | 長押し (500ms 以上)
     v
[リセット表示: 1]
```

### 遷移詳細

| 操作 | 遷移元状態 | 遷移後状態 |
|------|-----------|-----------|
| 短押し (count=0) | 初期 (count=0) | count=1 を表示 |
| 短押し (count≥1) | count=N | count=N×5 を表示 |
| 長押し | 任意のカウント値 | count=1 を表示 |

---

## 変更箇所

| ファイル | 変更内容 |
|---------|---------|
| `src/actions/increment-counter.ts` | `current * 3` → `current * 5` |
| `src/actions/__tests__/increment-counter.test.ts` | 3 倍のテストケースを 5 倍に更新 |

---

## 非機能要件

- 既存のユニットテストを更新し、5 倍の挙動をカバーする
- アクション UUID・manifest.json の変更なし

---

## 変更しないこと

- アクション UUID: `com.hrk-m.kot-punch.increment`
- `manifest.json`
- 長押しリセット動作
- 初期表示ロジック
