import { beforeEach, describe, expect, it, vi } from "vitest";

const mockLaunch = vi.fn();
const mockGoto = vi.fn().mockResolvedValue(null);
const mockDisconnect = vi.fn().mockResolvedValue(null);
const mockClose = vi.fn().mockResolvedValue(null);
const mockClick = vi.fn().mockResolvedValue(null);
const mockType = vi.fn().mockResolvedValue(null);
const mockWaitForNavigation = vi.fn().mockResolvedValue(null);

function makePage() {
    return {
        goto: mockGoto,
        click: mockClick,
        type: mockType,
        waitForNavigation: mockWaitForNavigation,
    };
}

const mockNewPage = vi.fn().mockResolvedValue(makePage());
const mockPages = vi.fn().mockResolvedValue([makePage()]);

vi.mock("puppeteer", () => ({
    default: { launch: mockLaunch },
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

const { openRequestPage } = await import("../open-request");

function resetMocks() {
    vi.clearAllMocks();
    mockGoto.mockResolvedValue(null);
    mockDisconnect.mockResolvedValue(null);
    mockClose.mockResolvedValue(null);
    mockClick.mockResolvedValue(null);
    mockType.mockResolvedValue(null);
    mockWaitForNavigation.mockResolvedValue(null);
    mockNewPage.mockResolvedValue(makePage());
    mockPages.mockResolvedValue([makePage()]);
    mockLaunch.mockResolvedValue({
        pages: mockPages,
        newPage: mockNewPage,
        disconnect: mockDisconnect,
        close: mockClose,
    });
}

describe("openRequestPage", () => {
    const settings = {
        requestUrl: "https://s3.ta.kingoftime.jp/admin",
        requestUsername: "admin",
        requestPassword: "pass1234",
    };

    beforeEach(() => {
        resetMocks();
    });

    it("ブラウザを可視モードかつ最大化で起動する", async () => {
        await openRequestPage(settings);

        expect(mockLaunch).toHaveBeenCalledWith({
            headless: false,
            defaultViewport: null,
            args: ["--start-maximized"],
        });
    });

    it("requestUrl が設定されているときその URL へアクセスする", async () => {
        await openRequestPage({ ...settings, requestUrl: "https://login.ta.kingoftime.jp/admin" });

        expect(mockGoto).toHaveBeenCalledWith("https://login.ta.kingoftime.jp/admin");
    });

    it("既存タブを再利用し、不要な newPage を作らない", async () => {
        await openRequestPage(settings);

        expect(mockPages).toHaveBeenCalledOnce();
        expect(mockNewPage).not.toHaveBeenCalled();
    });

    it("操作順序: goto → type(#login_id) → type(#login_password) → click(submit) → disconnect", async () => {
        const order: string[] = [];
        mockGoto.mockImplementation(() => {
            order.push("goto");
            return Promise.resolve(null);
        });
        mockType.mockImplementation((selector: string) => {
            order.push(`type(${selector})`);
            return Promise.resolve(null);
        });
        mockClick.mockImplementation(() => {
            order.push("click");
            return Promise.resolve(null);
        });
        mockWaitForNavigation.mockImplementation(() => {
            order.push("nav");
            return Promise.resolve(null);
        });
        mockDisconnect.mockImplementation(() => {
            order.push("disconnect");
            return Promise.resolve(null);
        });

        await openRequestPage(settings);

        expect(order).toEqual(["goto", "type(#login_id)", "type(#login_password)", "nav", "click", "disconnect"]);
    });

    it("#login_id に requestUsername を入力する", async () => {
        await openRequestPage(settings);

        expect(mockType).toHaveBeenCalledWith("#login_id", settings.requestUsername);
    });

    it("#login_password に requestPassword を入力する", async () => {
        await openRequestPage(settings);

        expect(mockType).toHaveBeenCalledWith("#login_password", settings.requestPassword);
    });

    it("#login_button クリックと waitForNavigation を並列実行する", async () => {
        await openRequestPage(settings);

        expect(mockClick).toHaveBeenCalledWith("#login_button");
        expect(mockWaitForNavigation).toHaveBeenCalledWith({ waitUntil: "networkidle0" });
    });

    it("browser.disconnect() を呼び、ウィンドウを残す（close ではない）", async () => {
        await openRequestPage(settings);

        expect(mockDisconnect).toHaveBeenCalledOnce();
        expect(mockClose).not.toHaveBeenCalled();
    });

    it("例外発生時は browser.close() でクリーンアップし、エラーを rethrow する", async () => {
        const navError = new Error("navigation timeout");
        mockWaitForNavigation.mockRejectedValueOnce(navError);

        await expect(openRequestPage(settings)).rejects.toBe(navError);
        expect(mockClose).toHaveBeenCalledOnce();
        expect(mockDisconnect).not.toHaveBeenCalled();
    });
});
