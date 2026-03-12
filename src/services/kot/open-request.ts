import puppeteer from "puppeteer";
import type { RequestSettings } from "../../platform/streamdeck/settings/request-settings";
import { logger } from "../../platform/streamdeck/logger";

// 申請画面へログインしてブラウザを渡す。
export async function openRequestPage(settings: RequestSettings): Promise<void> {
    const { requestUrl = "", requestUsername = "", requestPassword = "" } = settings;

    let browser;
    try {
        // ブラウザを可視モードで起動する。
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: ["--start-maximized"],
        });

        // 既存タブがあれば再利用する。
        const pages = await browser.pages();
        const page = pages[0] ?? (await browser.newPage());

        // ログインフォームへ値を入れる。
        logger.puppeteer.debug("opening request page");
        await page.goto(requestUrl);
        await page.type("#login_id", requestUsername);
        await page.type("#login_password", requestPassword);

        // クリックと遷移待機を同時に始める。
        await Promise.all([
            page.waitForNavigation({ waitUntil: "networkidle0" }),
            page.click("#login_button"),
        ]);

        // ブラウザを残して制御だけ返す。
        await browser.disconnect();
        logger.puppeteer.info("request page opened");
        browser = undefined;
    } catch (error) {
        // 失敗時はブラウザを閉じる。
        await browser?.close();
        throw error;
    }
}
