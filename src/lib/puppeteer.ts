import puppeteer from "puppeteer-core";
import type { GlobalSettings } from "./settings.js";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export async function openKotPage(settings: GlobalSettings): Promise<void> {
    const { kingOfTimeUrl = "", tokenKey = "", token = "" } = settings;

    let browser;
    try {
        try {
            browser = await puppeteer.launch({
                executablePath: CHROME_PATH,
                headless: false,
            });
        } catch (cause) {
            throw new Error("Chrome の起動に失敗しました。インストール済みか確認してください。", { cause });
        }

        const page = await browser.newPage();

        // 1. 勤怠画面へアクセス（domain 確立）
        try {
            await page.goto(kingOfTimeUrl);
        } catch (cause) {
            throw new Error(`KOT URL への接続に失敗しました: ${kingOfTimeUrl}`, { cause });
        }

        // 2. JWT クッキーをセット（domain 指定なし → 現在ページのドメインが自動適用）
        await page.setCookie({ name: tokenKey, value: token });

        // 3. 再アクセスして認証適用（ダイアログ = 認証失敗として扱う）
        let authDialogError: Error | undefined;
        page.on("dialog", async (dialog) => {
            authDialogError = new Error(
                `認証に失敗しました。トークンキーまたはトークンを確認してください。（${dialog.message()}）`,
            );
            await dialog.dismiss();
        });

        await page.goto(kingOfTimeUrl);

        if (authDialogError) {
            throw authDialogError;
        }
    } finally {
        await browser?.disconnect();
    }
}
