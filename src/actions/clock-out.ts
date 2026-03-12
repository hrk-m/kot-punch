import { action } from "@elgato/streamdeck";
import { logger } from "../platform/streamdeck/logger";
import { BasePunchAction } from "./punch/base-punch-action";

/**
 * An action class for clocking out.
 * State 0: 未打刻（通常アイコン）
 * State 1: 打刻済み（チェックマークアイコン）
 * State はセッション内のみ保持（プラグイン再起動でリセット）。当日限りの打刻管理として意図的に非永続化。
 */
@action({ UUID: "com.hrk-m.kot-punch.clock-out" })
export class ClockOut extends BasePunchAction {
	// 退勤 action のログを使う。
	protected readonly logger = logger.clockOut;
	// 退勤ボタンを押す。
	protected readonly selector = "#leave" as const;
	// 成功時の通知文言。
	protected readonly successMessage = "退勤打刻が完了しました";
}
