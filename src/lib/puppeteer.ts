import puppeteer from "puppeteer";
import type { GlobalSettings } from "./settings.js";

export async function openKotPage(settings: GlobalSettings): Promise<void> {
    const { kingOfTimeUrl = "", tokenKey = "", token = "" } = settings;

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: ["--start-maximized"],
        });

        const pages = await browser.pages();
        const page = pages[0] ?? (await browser.newPage());

        // 1. 勤怠画面へアクセス（domain 確立）
        await page.goto(kingOfTimeUrl);

        // 2. JWT クッキーをセット（domain 指定なし → 現在ページのドメインが自動適用）
        await page.setCookie({ name: tokenKey, value: token });

        // 3. 再アクセスして認証適用（ダイアログ = 認証失敗として扱う）
        let hasAuthDialog = false;
        page.on("dialog", async (dialog) => {
            hasAuthDialog = true;
            await dialog.dismiss();
        });

        await page.goto(kingOfTimeUrl);

        if (hasAuthDialog) {
            throw new Error("Authentication failed: dialog appeared while opening KING OF TIME.");
        }
    } finally {
        await browser?.disconnect();
    }
}
