import { action, SingletonAction } from "@elgato/streamdeck";
import type { KeyUpEvent } from "@elgato/streamdeck";
import { getGlobalSettings, hasRequiredPunchSettings } from "../lib/settings.js";
import { punchKot } from "../lib/puppeteer.js";
import { showErrorImage } from "../lib/showErrorImage.js";

/**
 * An action class for clocking in.
 * State 0: 未打刻（通常アイコン）
 * State 1: 打刻済み（チェックマークアイコン）
 */
@action({ UUID: "com.hrk-m.kot-punch.clock-in" })
export class ClockIn extends SingletonAction {
	private _isProcessing = false;

	override async onKeyUp(ev: KeyUpEvent): Promise<void> {
		if (this._isProcessing) return;

		if (ev.payload.state === 1) {
			await ev.action.setState(0);
			return;
		}

		this._isProcessing = true;
		try {
			const settings = await getGlobalSettings();
			if (!hasRequiredPunchSettings(settings)) {
				await ev.action.showAlert();
				return;
			}

			await punchKot("#attend", settings);
			await ev.action.showOk();
			await ev.action.setState(1);
		} catch {
			void showErrorImage(ev.action);
			await ev.action.setState(0);
		} finally {
			this._isProcessing = false;
		}
	}
}
