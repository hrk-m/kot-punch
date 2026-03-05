import { action, SingletonAction } from "@elgato/streamdeck";
import type { KeyDownEvent, KeyUpEvent, WillAppearEvent } from "@elgato/streamdeck";

const LONG_PRESS_MS = 500;
const MULTIPLIER = 5;

/**
 * An action class that displays a count that triples each time the button is pressed.
 * Long press (500ms) resets the count to 1.
 */
@action({ UUID: "com.hrk-m.kot-punch.increment" })
export class IncrementCounter extends SingletonAction<CounterSettings> {
	private _longPressTimer: ReturnType<typeof setTimeout> | undefined;
	private _isLongPress = false;

	override onWillAppear(ev: WillAppearEvent<CounterSettings>): void | Promise<void> {
		return ev.action.setTitle(`${ev.payload.settings.count ?? 1}`);
	}

	override onKeyDown(ev: KeyDownEvent<CounterSettings>): void | Promise<void> {
		this._isLongPress = false;
		this._longPressTimer = setTimeout(() => {
			this._isLongPress = true;
			ev.action.setSettings({ count: 1 }).then(() => {
				ev.action.setTitle("1");
			});
		}, LONG_PRESS_MS);
	}

	override async onKeyUp(ev: KeyUpEvent<CounterSettings>): Promise<void> {
		clearTimeout(this._longPressTimer);
		this._longPressTimer = undefined;

		if (this._isLongPress) return;

		const current = ev.payload.settings.count ?? 0;
		const newCount = current === 0 ? 1 : current * MULTIPLIER;
		await ev.action.setSettings({ count: newCount });
		await ev.action.setTitle(`${newCount}`);
	}
}

/**
 * Settings for {@link IncrementCounter}.
 */
type CounterSettings = {
	count?: number;
};
