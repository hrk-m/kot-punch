import { action, SingletonAction } from "@elgato/streamdeck";
import type { KeyDownEvent, KeyUpEvent, WillAppearEvent } from "@elgato/streamdeck";
import { getGlobalSettings, hasRequiredSettings } from "../lib/settings.js";
import { openKotPage } from "../lib/puppeteer.js";
import labels from "../labels/labels.json";

const { label: LABEL, labelProcessing: LABEL_PROCESSING, labelError: LABEL_ERROR } = labels["open-kot"];

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
            await ev.action.setTitle(LABEL_PROCESSING);
            await openKotPage(settings);
            await ev.action.setTitle(LABEL);
        } catch {
            await ev.action.showAlert();
            await ev.action.setTitle(LABEL_ERROR);
        } finally {
            this._isProcessing = false;
        }
    }
}
