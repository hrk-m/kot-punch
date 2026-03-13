import type { KotPunchSettings } from "../../platform/streamdeck/settings/punch-settings";
import { logger } from "../../platform/streamdeck/logger";
import { openAuthenticatedKotPage } from "./auth";

// 認証済みの KOT 画面を開いたまま渡す。
export async function openKotPage(settings: KotPunchSettings): Promise<void> {
    let browser;
    try {
        // 認証済みページを作ってブラウザを切り離す。
        ({ browser } = await openAuthenticatedKotPage({ ...settings, kotPunchHeadless: false }));
        await browser.disconnect();
        browser = undefined;
        logger.puppeteer.info("kot page opened");
    } catch (error) {
        // 失敗時は開いたブラウザを閉じる。
        await browser?.close();
        throw error;
    }
}
