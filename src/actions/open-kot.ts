import { action, SingletonAction } from "@elgato/streamdeck";
import type { KeyUpEvent } from "@elgato/streamdeck";
import { getGlobalSettings, hasRequiredSettings } from "../lib/settings.js";
import { openKotPage } from "../lib/puppeteer.js";
import { showErrorImage } from "../lib/showErrorImage.js";
import { notify } from "../lib/notify.js";

@action({ UUID: "com.hrk-m.kot-punch.open-kot" })
export class OpenKot extends SingletonAction {
    private _isProcessing = false;

    override async onKeyUp(ev: KeyUpEvent): Promise<void> {
        if (this._isProcessing) return;
        this._isProcessing = true;
        try {
            // グローバル設定を取得
            const settings = await getGlobalSettings();

            // 必須項目が未入力の場合はアラートを表示
            if (!hasRequiredSettings(settings)) {
                await ev.action.showAlert();
            } else {
                // KING OF TIME を開く
                await openKotPage(settings);
                void notify("KING OF TIME を開きました");
            }
        } catch {
            // showErrorImage は内部で失敗を処理するため fire-and-forget で呼ぶ。
            void showErrorImage(ev.action);
        } finally {
            this._isProcessing = false;
        }
    }
}
