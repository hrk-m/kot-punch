import notifier from "node-notifier";
import { logger } from "./logger";

const TITLE = "KOT Punch";
const SENDER = "com.elgato.StreamDeck";

export function notify(message: string): void {
    try {
        // @types/node-notifier が sender オプションを持っていないため型を補正する。
        const notification = { title: TITLE, message, sender: SENDER } as unknown as {
            title: string;
            message: string;
        };
        notifier.notify(
            notification,
            (error: Error | null | undefined) => {
                if (!error) {
                    logger.notify.debug(`notify succeeded: ${message}`);
                    return;
                }
                logger.notify.warn(`Failed to send desktop notification: ${error.message}`);
            }
        );
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        logger.notify.error(`Failed to send desktop notification: ${reason}`);
    }
}
