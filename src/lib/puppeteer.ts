import { setTimeout as sleep } from "node:timers/promises";
import puppeteer from "puppeteer";
import type { KotPunchSettings, RequestSettings } from "./settings";
import { logger } from "./logger";

/**
 * JWT 認証済みの KOT ページを開き、ブラウザとページを返す。
 * 認証失敗（ダイアログ発生）時はブラウザを閉じてエラーを throw する。
 * 呼び出し元が browser.disconnect() または browser.close() の責任を持つ。
 */
async function setupAuthenticatedPage(settings: KotPunchSettings) {
    const { kotPunchUrl = "", kotPunchKey = "", kotPunchToken = "" } = settings;

    let browser;
    try {
        logger.puppeteer.debug("launching browser");
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: ["--start-maximized"],
        });

        const pages = await browser.pages();
        const page = pages[0] ?? (await browser.newPage());

        // 勤怠画面へアクセス（domain 確立）
        logger.puppeteer.debug(`navigating to ${kotPunchUrl}`);
        await page.goto(kotPunchUrl);

        // JWT クッキーをセット（domain 指定なし → 現在ページのドメインが自動適用）
        logger.puppeteer.debug(`setting cookie: ${kotPunchKey}`);
        await page.setCookie({ name: kotPunchKey, value: kotPunchToken });

        // 再アクセスして認証適用（ダイアログ = 認証失敗として扱う）
        logger.puppeteer.debug("re-navigating for auth");
        let hasAuthDialog = false;
        page.once("dialog", async (dialog) => {
            hasAuthDialog = true;
            await dialog.dismiss();
        });

        await page.goto(kotPunchUrl);

        if (hasAuthDialog) {
            logger.puppeteer.error("auth failed: dialog detected");
            await browser.close();
            browser = undefined; // catch ブロックでの二重 close を防ぐ
            throw new Error("Authentication failed: dialog appeared while opening KING OF TIME.");
        }

        logger.puppeteer.debug("auth succeeded");
        return { browser, page };
    } catch (e) {
        await browser?.close();
        throw e;
    }
}

function escapeAttrValue(value: string) {
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * 打刻ボタンをクリックし、打刻を行う。
 */
export async function punchKot(selector: "#attend" | "#leave", settings: KotPunchSettings): Promise<void> {
    const { kotPunchUsername = "", kotPunchPassword = "", kotPunchDryRun = false } = settings;
    const escapedUsername = escapeAttrValue(kotPunchUsername);

    let browser;
    try {
        let page;
        ({ browser, page } = await setupAuthenticatedPage(settings));

        // 打刻ボタンをクリック
        logger.puppeteer.info(`clicking punch button: ${selector}`);
        await page.waitForSelector(selector);
        await page.click(selector);

        // ユーザーを選択（value 属性で出現を待機 → 500ms 後に title 属性でクリック）
        logger.puppeteer.debug("selecting user");
        await page.waitForSelector(`[value*="${escapedUsername}"]`);
        await sleep(500);
        await page.click(`[title*="${escapedUsername}"]`);

        // パスワード入力（ダイアログ出現を待機 → 500ms 後に入力）
        logger.puppeteer.debug("typing password");
        await page.waitForSelector("#password_dialog");
        await sleep(500);
        await page.type(".input_password", kotPunchPassword, { delay: 100 });

        // submit（kotPunchDryRun=false のときのみ）
        if (kotPunchDryRun) {
            logger.puppeteer.info("dry-run mode, skipping submit");
            // テストモード: パスワード入力まで確認できるようブラウザを開いたまま切断
            await browser.disconnect();
        } else {
            logger.puppeteer.info("submitting punch");
            await sleep(500);
            // KOT は submit 後に必ず遷移しないため、DOM から直接 click して短く待つ。
            const submitted = await page.evaluate(`(() => {
                const submit = document.querySelector("[type=submit]");
                if (!(submit instanceof HTMLElement)) {
                    return false;
                }

                submit.click();
                return true;
            })()`);
            if (!submitted) {
                throw new Error("Submit button not found.");
            }
            await sleep(1000);
            await browser.close();
        }
        logger.puppeteer.info("punch completed");
        browser = undefined; // catch ブロックでの二重 close を防ぐ
    } catch (e) {
        await browser?.close();
        throw e;
    }
}

/**
 * 申請画面にログインし、ブラウザをユーザーに引き渡す。
 * ログイン失敗（ナビゲーションタイムアウト等）時はブラウザを閉じてエラーを throw する。
 * 呼び出し元が browser.disconnect() または browser.close() の責任を持つ。
 */
export async function openRequestPage(settings: RequestSettings): Promise<void> {
    const { requestUrl = "", requestUsername = "", requestPassword = "" } = settings;

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: ["--start-maximized"],
        });

        const pages = await browser.pages();
        const page = pages[0] ?? (await browser.newPage());

        logger.puppeteer.debug("opening request page");
        await page.goto(requestUrl);
        await page.type("#login_id", requestUsername);
        await page.type("#login_password", requestPassword);

        await Promise.all([
            page.waitForNavigation({ waitUntil: "networkidle0" }),
            page.click("#login_button"),
        ]);

        await browser.disconnect();
        logger.puppeteer.info("request page opened");
        browser = undefined;
    } catch (e) {
        await browser?.close();
        throw e;
    }
}

/**
 * KING OF TIME を開く。
 */
export async function openKotPage(settings: KotPunchSettings): Promise<void> {
    let browser;
    try {
        ({ browser } = await setupAuthenticatedPage(settings));
        await browser.disconnect();
        logger.puppeteer.info("kot page opened");
    } catch (e) {
        await browser?.close();
        throw e;
    }
}
