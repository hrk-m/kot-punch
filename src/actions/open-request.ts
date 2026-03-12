import { action, SingletonAction } from "@elgato/streamdeck";
import type { KeyUpEvent } from "@elgato/streamdeck";
import {
    getRequestSettings,
    hasRequiredRequestSettings,
} from "../platform/streamdeck/settings/request-settings";
import { openRequestPage } from "../services/kot/open-request";
import { showErrorImage } from "../platform/streamdeck/show-error-image";
import { notify } from "../platform/desktop/notify";
import { logger } from "../platform/streamdeck/logger";

// 申請画面を開く action。
@action({ UUID: "com.hrk-m.kot-punch.open-request" })
export class OpenRequest extends SingletonAction {
    // 連打を防ぐ。
    private _isProcessing = false;

    // 設定を確認して申請画面を開く。
    override async onKeyUp(ev: KeyUpEvent): Promise<void> {
        logger.openRequest.info("onKeyUp triggered");

        // 処理中フラグが立っていれば即 return
        if (this._isProcessing) {
            logger.openRequest.debug("already processing, skipped");
            return;
        }
        // 処理中フラグを立てる
        this._isProcessing = true;

        try {
            // 申請画面用の設定を取得
            logger.openRequest.debug("fetching settings");
            const settings = await getRequestSettings();

            // 必須項目が未入力の場合はアラートを表示
            if (!hasRequiredRequestSettings(settings)) {
                logger.openRequest.warn("required settings missing");
                void notify("全項目必須です。設定を確認してください。");
                await ev.action.showAlert();
            } else {
                // 申請画面を開く
                logger.openRequest.info("opening page");
                await openRequestPage(settings);
                logger.openRequest.info("page opened");

                void notify("申請画面を開きました");
            }
        } catch (e) {
            logger.openRequest.error(`opening page failed: ${e instanceof Error ? e.message : String(e)}`);
            // エラー画像を表示
            void showErrorImage(ev.action);
        } finally {
            this._isProcessing = false;
        }
    }
}
