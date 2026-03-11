import { action, SingletonAction } from "@elgato/streamdeck";
import type { KeyUpEvent } from "@elgato/streamdeck";
import { getGlobalSettings, hasRequiredPunchSettings } from "../lib/settings.js";
import { punchKot } from "../lib/puppeteer.js";
import { showErrorImage } from "../lib/showErrorImage.js";
import { notify } from "../lib/notify.js";
import { logger } from "../lib/logger.js";
import { createPressTracker } from "../lib/long-press.js";
import type { KeyDownEvent } from "@elgato/streamdeck";

/**
 * An action class for clocking in.
 * State 0: 未打刻（通常アイコン）
 * State 1: 打刻済み（チェックマークアイコン）
 * State はセッション内のみ保持（プラグイン再起動でリセット）。当日限りの打刻管理として意図的に非永続化。
 */
@action({ UUID: "com.hrk-m.kot-punch.clock-in" })
export class ClockIn extends SingletonAction {
	// 処理中フラグ
	private _isProcessing = false;
	// 長押し判定ロジック
	private readonly pressTracker = createPressTracker();

	// key down では長押し監視だけを始める。
	override onKeyDown(ev: KeyDownEvent): void {
		if (this._isProcessing) {
			logger.clockIn.debug("already processing on key down, skipped");
			return;
		}

		const nextState = ev.payload.state === 1 ? 0 : 1;
		// 長押し成立時だけ state を反転する。
		this.pressTracker.begin(ev.action.id, () => {
			logger.clockIn.debug(`manual state update via long press: ${ev.payload.state} -> ${nextState}`);
			void ev.action.setState(nextState).catch((error: unknown) => {
				logger.clockIn.error(
					`manual state update failed: ${error instanceof Error ? error.message : String(error)}`,
				);
			});
		});
	}

	// key up では長押し済みかを見て、短押し時だけ打刻する。
	override async onKeyUp(ev: KeyUpEvent): Promise<void> {
		logger.clockIn.info("onKeyUp triggered");

		// 処理中フラグが立っていれば即 return
		if (this._isProcessing) {
			logger.clockIn.debug("already processing, skipped");
			this.pressTracker.clear(ev.action.id);
			return;
		}

		// 長押し済みなら key up 側の通常処理は実行しない。
		if (this.pressTracker.end(ev.action.id)) {
			const nextState = ev.payload.state === 1 ? 0 : 1;
			logger.clockIn.debug(`key up skipped after long press: ${ev.payload.state} -> ${nextState}`);
			return;
		}

		// State 1 の短押しは no-op
		if (ev.payload.state === 1) {
			logger.clockIn.debug("short press on state 1 skipped");
			return;
		}

		// 処理中フラグを立てる
		this._isProcessing = true;

		try {
			// グローバル設定を取得
			logger.clockIn.debug("fetching settings");
			const settings = await getGlobalSettings();

			// 必須項目が未入力の場合はアラートを表示
			if (!hasRequiredPunchSettings(settings)) {
				logger.clockIn.warn("required settings missing");
				void notify("全項目必須です。設定を確認してください。");
				await ev.action.showAlert();
				return;
			}

			// 出勤打刻を行う
			logger.clockIn.info("starting punch");
			await punchKot("#attend", settings);
			logger.clockIn.info("punch succeeded");
			await ev.action.showOk();
			await ev.action.setState(1);
			void notify("出勤打刻が完了しました");
		} catch (e) {
			logger.clockIn.error(`punch failed: ${e instanceof Error ? e.message : String(e)}`);
			// エラー画像を表示
			void showErrorImage(ev.action);
			await ev.action.setState(0);
		} finally {
			// 処理中フラグを解除
			this._isProcessing = false;
		}
	}
}
