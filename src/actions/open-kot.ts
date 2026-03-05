import { action, SingletonAction } from "@elgato/streamdeck";
import type { KeyDownEvent, KeyUpEvent, WillAppearEvent } from "@elgato/streamdeck";
import { getGlobalSettings, hasRequiredSettings } from "../lib/settings.js";
import { openKotPage } from "../lib/puppeteer.js";
import { notifyError } from "../lib/notify.js";
import labels from "../labels/labels.json";

const { label: LABEL } = labels["open-kot"];
const ERROR_DISPLAY_MS = 3000;

@action({ UUID: "com.hrk-m.kot-punch.open-kot" })
export class OpenKot extends SingletonAction {
    private _isProcessing = false;

    override onWillAppear(ev: WillAppearEvent): void | Promise<void> {
        return ev.action.setTitle(LABEL);
    }

    override onKeyDown(_ev: KeyDownEvent): void {
        if (this._isProcessing) return;
    }

    override async onKeyUp(ev: KeyUpEvent): Promise<void> {
        if (this._isProcessing) return;
        this._isProcessing = true;
        try {
            const settings = await getGlobalSettings();
            if (!hasRequiredSettings(settings)) {
                await ev.action.showAlert();
                return;
            }
            await openKotPage(settings);
            await ev.action.setTitle(LABEL);
        } catch (e) {
            const message = e instanceof Error ? e.message : "不明なエラーが発生しました。";
            notifyError("KOT Punch エラー", message, ev.action);
            setTimeout(async () => {
                await ev.action.setTitle(LABEL);
            }, ERROR_DISPLAY_MS);
        } finally {
            this._isProcessing = false;
        }
    }
}
