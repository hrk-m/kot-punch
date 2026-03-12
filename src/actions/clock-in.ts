import { action } from "@elgato/streamdeck";
import { logger } from "../platform/streamdeck/logger";
import { BasePunchAction } from "./punch/base-punch-action";

/**
 * An action class for clocking in.
 * State 0: 未打刻（通常アイコン）
 * State 1: 打刻済み（チェックマークアイコン）
 * State はセッション内のみ保持（プラグイン再起動でリセット）。当日限りの打刻管理として意図的に非永続化。
 */
@action({ UUID: "com.hrk-m.kot-punch.clock-in" })
export class ClockIn extends BasePunchAction {
	// 出勤 action のログを使う。
	protected readonly logger = logger.clockIn;
	// 出勤ボタンを押す。
	protected readonly selector = "#attend" as const;
	// 成功時の通知文言。
	protected readonly successMessage = "出勤打刻が完了しました";
}
