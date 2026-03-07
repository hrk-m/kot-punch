import puppeteer from "puppeteer";
import type { GlobalSettings } from "./settings";

/**
 * JWT 認証済みの KOT ページを開き、ブラウザとページを返す。
 * 認証失敗（ダイアログ発生）時はブラウザを閉じてエラーを throw する。
 * 呼び出し元が browser.disconnect() または browser.close() の責任を持つ。
 */
async function setupAuthenticatedPage(settings: GlobalSettings) {
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
        page.once("dialog", async (dialog) => {
            hasAuthDialog = true;
            await dialog.dismiss();
        });

        await page.goto(kingOfTimeUrl);

        if (hasAuthDialog) {
            await browser.close();
            browser = undefined; // catch ブロックでの二重 close を防ぐ
            throw new Error("Authentication failed: dialog appeared while opening KING OF TIME.");
        }

        return { browser, page };
    } catch (e) {
        await browser?.close();
        throw e;
    }
}

/**
 * 打刻ボタンをクリックし、打刻を行う。
 */
export async function punchKot(selector: "#attend" | "#leave", settings: GlobalSettings): Promise<void> {
    const { username = "", password = "", dryRun = false } = settings;

    let browser;
    try {
        let page;
        ({ browser, page } = await setupAuthenticatedPage(settings));

        // 4. 打刻ボタンをクリック
        await page.click(selector);

        // 5. ユーザーを選択（テキスト照合）
        await page.click(`::-p-text(${username.replace(/\)/g, "\\)")})`);

        // 6. パスワード入力
        await page.type("input[type=password]", password, { delay: dryRun ? 100 : 0 });

        // 7. submit（dryRun=false のときのみ）
        if (dryRun) {
            // テストモード: パスワード入力まで確認できるようブラウザを開いたまま切断
            await browser.disconnect();
        } else {
            await Promise.all([
                page.waitForNavigation({ waitUntil: "networkidle0" }),
                page.click("button[type=submit]"),
            ]);
            await browser.close();
        }
        browser = undefined; // catch ブロックでの二重 close を防ぐ
    } catch (e) {
        await browser?.close();
        throw e;
    }
}

/**
 * KING OF TIME を開く。
 */
export async function openKotPage(settings: GlobalSettings): Promise<void> {
    let browser;
    try {
        ({ browser } = await setupAuthenticatedPage(settings));
        await browser.disconnect();
    } catch (e) {
        await browser?.close();
        throw e;
    }
}
