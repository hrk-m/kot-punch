import { action, SingletonAction } from "@elgato/streamdeck";
import type { KeyUpEvent } from "@elgato/streamdeck";
import { getGlobalSettings, hasRequiredPunchSettings } from "../lib/settings.js";
import { punchKot } from "../lib/puppeteer.js";
import { showErrorImage } from "../lib/showErrorImage.js";
import { notify } from "../lib/notify.js";

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

	override async onKeyUp(ev: KeyUpEvent): Promise<void> {
		// 処理中フラグが立っていれば即 return
		if (this._isProcessing) return;

		// State 1 の場合はリセット
		if (ev.payload.state === 1) {
			await ev.action.setState(0);
			return;
		}

		// 処理中フラグを立てる
		this._isProcessing = true;

		try {
			// グローバル設定を取得
			const settings = await getGlobalSettings();

			// 必須項目が未入力の場合はアラートを表示
			if (!hasRequiredPunchSettings(settings)) {
				await ev.action.showAlert();
				return;
			}

			// 退勤打刻を行う
			await punchKot("#leave", settings);
			await ev.action.showOk();
			await ev.action.setState(1);
			void notify("退勤打刻が完了しました");
		} catch {
			// エラー画像を表示
			void showErrorImage(ev.action);
			await ev.action.setState(0);
		} finally {
			// 処理中フラグを解除
			this._isProcessing = false;
		}
	}
}
