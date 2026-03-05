import { action, SingletonAction } from "@elgato/streamdeck";
import type { KeyDownEvent, KeyUpEvent, WillAppearEvent } from "@elgato/streamdeck";

const LONG_PRESS_MS = 500;
const LABEL = "退勤";
const LABEL_PUNCHED = "✅";

/**
 * An action class for clocking out.
 * Short press marks as punched (shows ✅). Long press (500ms) resets to initial label.
 */
@action({ UUID: "com.hrk-m.kot-punch.clock-out" })
export class ClockOut extends SingletonAction<ClockSettings> {
	private _longPressTimer: ReturnType<typeof setTimeout> | undefined;
	private _isLongPress = false;

	override onWillAppear(ev: WillAppearEvent<ClockSettings>): void | Promise<void> {
		const title = ev.payload.settings.punched ? LABEL_PUNCHED : LABEL;
		return ev.action.setTitle(title);
	}

	override onKeyDown(ev: KeyDownEvent<ClockSettings>): void | Promise<void> {
		this._isLongPress = false;
		this._longPressTimer = setTimeout(async () => {
			this._isLongPress = true;
			try {
				await ev.action.setSettings({ punched: false });
				await ev.action.setTitle(LABEL);
			} catch {
				// Prevent unhandled rejections from async timer callback.
			}
		}, LONG_PRESS_MS);
	}

	override async onKeyUp(ev: KeyUpEvent<ClockSettings>): Promise<void> {
		clearTimeout(this._longPressTimer);
		this._longPressTimer = undefined;

		if (this._isLongPress) return;

		await ev.action.setSettings({ punched: true });
		await ev.action.setTitle(LABEL_PUNCHED);
	}
}

type ClockSettings = {
	punched?: boolean;
};
