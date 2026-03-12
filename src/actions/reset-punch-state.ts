import streamDeck, { action, SingletonAction } from "@elgato/streamdeck";
import type { KeyUpEvent } from "@elgato/streamdeck";
import { notify } from "../platform/desktop/notify";
import { logger } from "../platform/streamdeck/logger";

// リセット対象の action UUID。
const RESET_TARGET_IDS = new Set([
    "com.hrk-m.kot-punch.clock-in",
    "com.hrk-m.kot-punch.clock-out",
]);

// 出勤・退勤の打刻済み状態を未打刻にリセットする action。
@action({ UUID: "com.hrk-m.kot-punch.reset-punch-state" })
export class ResetPunchState extends SingletonAction<Record<string, never>> {
    // 打刻 state を一括リセットする。
    override async onKeyUp(_ev: KeyUpEvent<Record<string, never>>): Promise<void> {
        logger.resetPunchState.info("onKeyUp triggered");

        const promises: Promise<void>[] = [];
        for (const act of streamDeck.actions) {
            if (!RESET_TARGET_IDS.has(act.manifestId) || !act.isKey()) {
                continue;
            }
            const manifestId = act.manifestId;
            promises.push(
                act.setState(0)
                    .then(() => {
                        logger.resetPunchState.debug(`setState(0) succeeded: ${manifestId}`);
                    })
                    .catch((error: unknown) => {
                        logger.resetPunchState.error(
                            `setState(0) failed for ${manifestId}: ${error instanceof Error ? error.message : String(error)}`,
                        );
                    }),
            );
        }
        await Promise.all(promises);

        void notify("打刻状態(出勤/退勤)をリセットしました");
    }
}
