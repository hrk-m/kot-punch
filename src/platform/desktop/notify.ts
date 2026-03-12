import notifier from "node-notifier";
import { logger } from "../streamdeck/logger";

// 通知のタイトルを固定する。
const TITLE = "KOT Punch";
// macOS 側の送信元を固定する。
const SENDER = "com.elgato.StreamDeck";

// デスクトップ通知を送る。
export function notify(message: string): void {
    try {
        // sender を含めた通知オプションを作る。
        const notification = { title: TITLE, message, sender: SENDER } as unknown as {
            title: string;
            message: string;
        };
        notifier.notify(notification, (error: Error | null | undefined) => {
            // 成功時は debug ログだけ残す。
            if (!error) {
                logger.notify.debug(`notify succeeded: ${message}`);
                return;
            }
            // callback 経由の失敗は warning に寄せる。
            logger.notify.warn(`Failed to send desktop notification: ${error.message}`);
        });
    } catch (error) {
        // 同期例外は error ログに寄せる。
        const reason = error instanceof Error ? error.message : String(error);
        logger.notify.error(`Failed to send desktop notification: ${reason}`);
    }
}
