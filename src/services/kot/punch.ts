import { setTimeout as sleep } from "node:timers/promises";
import type { KotPunchSettings } from "../../platform/streamdeck/settings/punch-settings";
import { logger } from "../../platform/streamdeck/logger";
import { openAuthenticatedKotPage } from "./auth";

// 打刻で押すボタンを表す。
export type PunchSelector = "#attend" | "#leave";

// CSS 属性セレクタ向けに文字を逃がす。
function escapeAttrValue(value: string): string {
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// 認証済み画面で打刻を完了する。
export async function punchKot(selector: PunchSelector, settings: KotPunchSettings): Promise<void> {
    const { kotPunchUsername = "", kotPunchPassword = "", kotPunchDryRun = false } = settings;
    const escapedUsername = escapeAttrValue(kotPunchUsername);

    // 後始末のため browser を握る。
    let browser;
    try {
        let page;
        // 先に認証済みページを作る。
        ({ browser, page } = await openAuthenticatedKotPage(settings));

        // 打刻ボタンを押す。
        logger.puppeteer.info(`clicking punch button: ${selector}`);
        await page.waitForSelector(selector);
        await page.click(selector);

        // 対象ユーザーを選ぶ。
        logger.puppeteer.debug("selecting user");
        await page.waitForSelector(`[value*="${escapedUsername}"]`);
        await sleep(500);
        await page.click(`[title*="${escapedUsername}"]`);

        // パスワードを入れる。
        logger.puppeteer.debug("typing password");
        await page.waitForSelector("#password_dialog");
        await sleep(500);
        await page.type(".input_password", kotPunchPassword, { delay: 100 });

        if (kotPunchDryRun) {
            // dry-run では submit せずに画面を残す。
            logger.puppeteer.info("dry-run mode, skipping submit");
            await browser.disconnect();
        } else {
            // 本番では submit して少し待つ。
            logger.puppeteer.info("submitting punch");
            await sleep(500);
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

        // close 済みなら finally 側の close を避ける。
        logger.puppeteer.info("punch completed");
        browser = undefined;
    } catch (error) {
        // 失敗時はブラウザを閉じる。
        await browser?.close();
        throw error;
    }
}
