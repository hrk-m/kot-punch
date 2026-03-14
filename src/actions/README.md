# actions

Stream Deck の入力イベントを受けて、アクション単位の処理を開始する層です。

## 役割

- `onKeyDown` / `onKeyUp` を受けて処理を分岐する
- 設定確認、`showOk()`、`showAlert()`、`setState()` などのアクション制御を行う
- `services/` の業務処理と `platform/` の環境依存処理を呼び分ける

## 代表例

- `clock-in.ts` / `clock-out.ts`
- `open-kot.ts` / `open-request.ts`
- `punch/base-punch-action.ts`
