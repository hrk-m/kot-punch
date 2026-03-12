import puppeteer, { type Browser, type Page } from "puppeteer";
import type { KotPunchSettings } from "../../platform/streamdeck/settings/punch-settings";
import { logger } from "../../platform/streamdeck/logger";

// 認証済みの KOT ページを用意する。
export async function openAuthenticatedKotPage(
    settings: KotPunchSettings,
): Promise<{ browser: Browser; page: Page }> {
    const { kotPunchUrl = "", kotPunchKey = "", kotPunchToken = "" } = settings;

    // 後続処理へ渡す browser を握る。
    let browser;
    try {
        // ブラウザを可視モードで起動する。
        logger.puppeteer.debug("launching browser");
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: ["--start-maximized"],
        });

        // 既存タブがあれば再利用する。
        const pages = await browser.pages();
        const page = pages[0] ?? (await browser.newPage());

        // 先に URL を開いて JWT トークンの対象ドメインを作る。
        logger.puppeteer.debug(`navigating to ${kotPunchUrl}`);
        await page.goto(kotPunchUrl);

        // JWT トークンをセットする。
        logger.puppeteer.debug(`setting JWT token: ${kotPunchKey}`);
        await page.setCookie({ name: kotPunchKey, value: kotPunchToken });

        // 再読込で認証結果を反映する。
        logger.puppeteer.debug("re-navigating for auth");
        let hasAuthDialog = false;
        page.once("dialog", async (dialog) => {
            hasAuthDialog = true;
            await dialog.dismiss();
        });

        // dialog 判定は load 待ちとセットで扱う。
        await page.goto(kotPunchUrl, { waitUntil: "load" });

        // dialog は認証失敗として扱う。
        if (hasAuthDialog) {
            logger.puppeteer.error("auth failed: dialog detected");
            await browser.close();
            browser = undefined;
            throw new Error("Authentication failed: dialog appeared while opening KING OF TIME.");
        }

        logger.puppeteer.debug("auth succeeded");
        return { browser, page };
    } catch (error) {
        // 途中失敗時はブラウザを閉じる。
        await browser?.close();
        throw error;
    }
}
