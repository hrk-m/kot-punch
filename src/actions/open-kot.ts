import { action, SingletonAction } from "@elgato/streamdeck";
import type { KeyUpEvent } from "@elgato/streamdeck";
import { getGlobalSettings, hasRequiredSettings } from "../lib/settings.js";
import { openKotPage } from "../lib/puppeteer.js";
import { showErrorImage } from "../lib/showErrorImage.js";
import { notify } from "../lib/notify.js";
import { logger } from "../lib/logger.js";

@action({ UUID: "com.hrk-m.kot-punch.open-kot" })
export class OpenKot extends SingletonAction {
    private _isProcessing = false;

    override async onKeyUp(ev: KeyUpEvent): Promise<void> {
        logger.openKot.info("onKeyUp triggered");

        if (this._isProcessing) {
            logger.openKot.debug("already processing, skipped");
            return;
        }
        this._isProcessing = true;
        try {
            // グローバル設定を取得
            logger.openKot.debug("fetching settings");
            const settings = await getGlobalSettings();

            // 必須項目が未入力の場合はアラートを表示
            if (!hasRequiredSettings(settings)) {
                logger.openKot.warn("required settings missing");
                await ev.action.showAlert();
            } else {
                // KING OF TIME を開く
                logger.openKot.info("opening page");
                await openKotPage(settings);
                logger.openKot.info("page opened");
                void notify("KING OF TIME を開きました");
            }
        } catch (e) {
            logger.openKot.error(`opening page failed: ${e instanceof Error ? e.message : String(e)}`);
            // showErrorImage は内部で失敗を処理するため fire-and-forget で呼ぶ。
            void showErrorImage(ev.action);
        } finally {
            this._isProcessing = false;
        }
    }
}
