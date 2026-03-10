import { action, SingletonAction } from "@elgato/streamdeck";
import type { KeyUpEvent } from "@elgato/streamdeck";
import { getGlobalSettings, hasRequiredPunchSettings } from "../lib/settings.js";
import { punchKot } from "../lib/puppeteer.js";
import { showErrorImage } from "../lib/showErrorImage.js";
import { notify } from "../lib/notify.js";
import { logger } from "../lib/logger.js";
import { createPressTracker, isLongPress } from "../lib/long-press.js";
import type { KeyDownEvent } from "@elgato/streamdeck";

/**
 * An action class for clocking out.
 * State 0: 未打刻（通常アイコン）
 * State 1: 打刻済み（チェックマークアイコン）
 * State はセッション内のみ保持（プラグイン再起動でリセット）。当日限りの打刻管理として意図的に非永続化。
 */
@action({ UUID: "com.hrk-m.kot-punch.clock-out" })
export class ClockOut extends SingletonAction {
	// 処理中フラグ
	private _isProcessing = false;
	private readonly pressTracker = createPressTracker();

	override onKeyDown(ev: KeyDownEvent): void {
		if (this._isProcessing) {
			logger.clockOut.debug("already processing on key down, skipped");
			return;
		}

		this.pressTracker.begin(ev.action.id);
	}

	override async onKeyUp(ev: KeyUpEvent): Promise<void> {
		logger.clockOut.info("onKeyUp triggered");

		// 処理中フラグが立っていれば即 return
		if (this._isProcessing) {
			logger.clockOut.debug("already processing, skipped");
			this.pressTracker.clear(ev.action.id);
			return;
		}

		const duration = this.pressTracker.end(ev.action.id);
		if (duration !== undefined && isLongPress(duration)) {
			const nextState = ev.payload.state === 1 ? 0 : 1;
			logger.clockOut.debug(`manual state update via long press: ${ev.payload.state} -> ${nextState}`);
			await ev.action.setState(nextState);
			return;
		}

		// State 1 の短押しは no-op
		if (ev.payload.state === 1) {
			logger.clockOut.debug("short press on state 1 skipped");
			return;
		}

		// 処理中フラグを立てる
		this._isProcessing = true;

		try {
			// グローバル設定を取得
			logger.clockOut.debug("fetching settings");
			const settings = await getGlobalSettings();

			// 必須項目が未入力の場合はアラートを表示
			if (!hasRequiredPunchSettings(settings)) {
				logger.clockOut.warn("required settings missing");
				await ev.action.showAlert();
				return;
			}

			// 退勤打刻を行う
			logger.clockOut.info("starting punch");
			await punchKot("#leave", settings);
			logger.clockOut.info("punch succeeded");
			await ev.action.showOk();
			await ev.action.setState(1);
			void notify("退勤打刻が完了しました");
		} catch (e) {
			logger.clockOut.error(`punch failed: ${e instanceof Error ? e.message : String(e)}`);
			// エラー画像を表示
			void showErrorImage(ev.action);
			await ev.action.setState(0);
		} finally {
			// 処理中フラグを解除
			this._isProcessing = false;
		}
	}
}
