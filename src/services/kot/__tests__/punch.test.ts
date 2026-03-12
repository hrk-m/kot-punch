import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockOpenAuthenticatedKotPage = vi.fn();
const mockSleep = vi.fn().mockResolvedValue(undefined);

vi.mock("../auth", () => ({
    openAuthenticatedKotPage: mockOpenAuthenticatedKotPage,
}));

vi.mock("node:timers/promises", () => ({
    setTimeout: mockSleep,
}));

vi.mock("../../../platform/streamdeck/logger", () => ({
    logger: {
        puppeteer: {
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
        },
    },
}));

const { punchKot } = await import("../punch");

const mockDisconnect = vi.fn().mockResolvedValue(undefined);
const mockClose = vi.fn().mockResolvedValue(undefined);
const mockClick = vi.fn().mockResolvedValue(null);
const mockType = vi.fn().mockResolvedValue(null);
const mockWaitForSelector = vi.fn().mockResolvedValue(null);
const mockEvaluate = vi.fn().mockResolvedValue(true);

function makePage() {
    return {
        click: mockClick,
        type: mockType,
        waitForSelector: mockWaitForSelector,
        evaluate: mockEvaluate,
    };
}

const browser = { disconnect: mockDisconnect, close: mockClose };

function resetMocks() {
    vi.clearAllMocks();
    mockSleep.mockResolvedValue(undefined);
    mockDisconnect.mockResolvedValue(undefined);
    mockClose.mockResolvedValue(undefined);
    mockClick.mockResolvedValue(null);
    mockType.mockResolvedValue(null);
    mockWaitForSelector.mockResolvedValue(null);
    mockEvaluate.mockResolvedValue(true);
    mockOpenAuthenticatedKotPage.mockResolvedValue({ browser, page: makePage() });
}

describe("punchKot", () => {
    const settings = {
        kotPunchUrl: "https://kingoftime-recorder.appspot.com/login?section=1000",
        kotPunchKey: "htjwt_xxx",
        kotPunchToken: "abc123",
        kotPunchUsername: "山田 太郎",
        kotPunchPassword: "pass1234",
    };

    beforeEach(() => {
        resetMocks();
    });

    afterEach(() => {
        delete process.env.KOT_PUNCH_DRY_RUN;
    });

    it("KOT_PUNCH_DRY_RUN 未設定: #attend クリック → ユーザー選択 → パスワード入力 → submit が実行される", async () => {
        await punchKot("#attend", settings);

        const clickArgs = mockClick.mock.calls.map((call) => call[0]);
        expect(clickArgs).toContain("#attend");
        expect(clickArgs).toContain(`[title*="${settings.kotPunchUsername}"]`);
        expect(mockWaitForSelector).toHaveBeenCalledWith("#attend");
        expect(mockWaitForSelector).toHaveBeenCalledWith(`[value*="${settings.kotPunchUsername}"]`);
        expect(mockWaitForSelector).toHaveBeenCalledWith("#password_dialog");
        expect(mockType).toHaveBeenCalledWith(".input_password", settings.kotPunchPassword, { delay: 100 });
        expect(mockEvaluate).toHaveBeenCalledOnce();
        expect(mockClose).toHaveBeenCalledOnce();
        expect(mockDisconnect).not.toHaveBeenCalled();
    });

    it("KOT_PUNCH_DRY_RUN 未設定: 固定遅延には sleep を使う", async () => {
        await punchKot("#attend", settings);

        expect(mockSleep).toHaveBeenCalledTimes(4);
        expect(mockSleep).toHaveBeenNthCalledWith(1, 500);
        expect(mockSleep).toHaveBeenNthCalledWith(2, 500);
        expect(mockSleep).toHaveBeenNthCalledWith(3, 500);
        expect(mockSleep).toHaveBeenNthCalledWith(4, 1000);
    });

    it("KOT_PUNCH_DRY_RUN 未設定: 操作順序が #attend → ユーザー選択 → パスワード入力 → submit になる", async () => {
        const order: string[] = [];
        mockWaitForSelector.mockImplementation((selector: string) => {
            if (selector === "#attend") {
                order.push("waitAttend");
            } else if (selector === `[value*="${settings.kotPunchUsername}"]`) {
                order.push("waitUser");
            } else if (selector === "#password_dialog") {
                order.push("waitDialog");
            }
            return Promise.resolve(null);
        });
        mockClick.mockImplementation((selector: string) => {
            if (selector === "#attend") {
                order.push("attend");
            } else if (selector === `[title*="${settings.kotPunchUsername}"]`) {
                order.push("selectUser");
            }
            return Promise.resolve(null);
        });
        mockType.mockImplementation(() => {
            order.push("typePassword");
            return Promise.resolve(null);
        });
        mockEvaluate.mockImplementation(() => {
            order.push("submit");
            return Promise.resolve(true);
        });

        await punchKot("#attend", settings);

        expect(order).toEqual([
            "waitAttend",
            "attend",
            "waitUser",
            "selectUser",
            "waitDialog",
            "typePassword",
            "submit",
        ]);
    });

    it("KOT_PUNCH_DRY_RUN 未設定: submit 後に画面遷移しなくても成功扱いにする", async () => {
        await expect(punchKot("#attend", settings)).resolves.toBeUndefined();
        expect(mockEvaluate).toHaveBeenCalledOnce();
        expect(mockClose).toHaveBeenCalledOnce();
    });

    it("KOT_PUNCH_DRY_RUN 未設定: submit ボタンが見つからない場合はエラーを rethrow する", async () => {
        mockEvaluate.mockResolvedValue(false);

        await expect(punchKot("#attend", settings)).rejects.toThrow("Submit button not found.");
        expect(mockClose).toHaveBeenCalledOnce();
    });

    it("KOT_PUNCH_DRY_RUN=true: submit がスキップされる", async () => {
        process.env.KOT_PUNCH_DRY_RUN = "true";

        await punchKot("#attend", settings);

        expect(mockEvaluate).not.toHaveBeenCalled();
        expect(mockType).toHaveBeenCalledWith(".input_password", settings.kotPunchPassword, { delay: 100 });
        expect(mockDisconnect).toHaveBeenCalledOnce();
        expect(mockClose).not.toHaveBeenCalled();
    });

    it("#leave + KOT_PUNCH_DRY_RUN=true: #leave ボタンをクリックする", async () => {
        process.env.KOT_PUNCH_DRY_RUN = "true";

        await punchKot("#leave", settings);

        const clickArgs = mockClick.mock.calls.map((call) => call[0]);
        expect(clickArgs).toContain("#leave");
        expect(mockDisconnect).toHaveBeenCalledOnce();
    });

    it('KOT_PUNCH_DRY_RUN=true: ユーザー名に " を含むとき CSS 属性セレクタ用にエスケープする', async () => {
        process.env.KOT_PUNCH_DRY_RUN = "true";

        await punchKot("#attend", { ...settings, kotPunchUsername: '山田 "太郎"' });

        expect(mockWaitForSelector).toHaveBeenCalledWith('[value*="山田 \\"太郎\\""]');
        expect(mockClick).toHaveBeenCalledWith('[title*="山田 \\"太郎\\""]');
    });

    it("KOT_PUNCH_DRY_RUN=true: ユーザー名に \\ を含むとき CSS 属性セレクタ用にエスケープする", async () => {
        process.env.KOT_PUNCH_DRY_RUN = "true";

        await punchKot("#attend", { ...settings, kotPunchUsername: "domain\\user" });

        expect(mockWaitForSelector).toHaveBeenCalledWith('[value*="domain\\\\user"]');
        expect(mockClick).toHaveBeenCalledWith('[title*="domain\\\\user"]');
    });

    it("途中で例外が発生したら browser.close() でクリーンアップして rethrow する", async () => {
        const clickError = new Error("click failed");
        mockClick.mockRejectedValueOnce(clickError);

        await expect(punchKot("#attend", settings)).rejects.toBe(clickError);
        expect(mockClose).toHaveBeenCalledOnce();
    });
});
