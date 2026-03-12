import { action, SingletonAction } from "@elgato/streamdeck";
import type { KeyUpEvent } from "@elgato/streamdeck";
import {
    getGlobalSettings,
    hasRequiredSettings,
    type KotPunchSettings,
} from "../platform/streamdeck/settings/punch-settings";
import { openKotPage } from "../services/kot/open-kot";
import { showErrorImage } from "../platform/streamdeck/show-error-image";
import { notify } from "../platform/desktop/notify";
import { logger } from "../platform/streamdeck/logger";

// KOT 画面を開く action。
@action({ UUID: "com.hrk-m.kot-punch.open-kot" })
export class OpenKot extends SingletonAction<KotPunchSettings> {
    // 連打を防ぐ。
    private _isProcessing = false;

    // 設定を確認して KOT を開く。
    override async onKeyUp(ev: KeyUpEvent<KotPunchSettings>): Promise<void> {
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
                void notify("全項目必須です。設定を確認してください。");
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
