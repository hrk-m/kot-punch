# platform

Stream Deck SDK や macOS など、実行環境に依存する処理をまとめる層です。

## 役割

- SDK や OS との接続点を小さな API として切り出す
- 設定取得、ロガー、通知、エラー表示などの環境依存処理を隠蔽する
- 上位の層が実行環境の詳細を意識しなくてよい形に整える

## 代表例

- `streamdeck/logger.ts`
- `streamdeck/settings/`
- `desktop/notify.ts`
