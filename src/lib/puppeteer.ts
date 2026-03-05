import puppeteer from "puppeteer-core";
import type { GlobalSettings } from "./settings.js";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export async function openKotPage(settings: GlobalSettings): Promise<void> {
    const browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: false,
    });
    const { kingOfTimeUrl = "", tokenKey = "", token = "" } = settings;
    const page = await browser.newPage();
    // 1. 勤怠画面へアクセス（domain 確立）
    await page.goto(kingOfTimeUrl);
    // 2. JWT クッキーをセット（domain 指定なし → 現在ページのドメインが自動適用）
    await page.setCookie({ name: tokenKey, value: token });
    // 3. 再アクセスして認証適用
    await page.goto(kingOfTimeUrl);
    // 4. ウィンドウを残したまま切断
    await browser.disconnect();
}
