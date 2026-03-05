import puppeteer from "puppeteer-core";
import type { GlobalSettings } from "./settings.js";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export async function openKotPage(settings: GlobalSettings): Promise<void> {
    const { kingOfTimeUrl = "", tokenKey = "", token = "" } = settings;

    let browser;
    try {
        browser = await puppeteer.launch({
            executablePath: CHROME_PATH,
            headless: false,
        });
    } catch (cause) {
        throw new Error("Chrome の起動に失敗しました。インストール済みか確認してください。", { cause });
    }

    let page;
    try {
        page = await browser.newPage();
    } catch (cause) {
        throw new Error("新しいタブを開けませんでした。", { cause });
    }

    // 1. 勤怠画面へアクセス（domain 確立）
    try {
        await page.goto(kingOfTimeUrl);
    } catch (cause) {
        throw new Error(`KOT URL への接続に失敗しました: ${kingOfTimeUrl}`, { cause });
    }

    // 2. JWT クッキーをセット（domain 指定なし → 現在ページのドメインが自動適用）
    try {
        await page.setCookie({ name: tokenKey, value: token });
    } catch (cause) {
        throw new Error("Cookie のセットに失敗しました。トークンキーまたはトークンを確認してください。", { cause });
    }

    // 3. 再アクセスして認証適用
    try {
        await page.goto(kingOfTimeUrl);
    } catch (cause) {
        throw new Error(`認証後の再アクセスに失敗しました: ${kingOfTimeUrl}`, { cause });
    }

    // 4. ウィンドウを残したまま切断
    await browser.disconnect();
}
