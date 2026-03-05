import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGoto = vi.fn().mockResolvedValue(null);
const mockSetCookie = vi.fn().mockResolvedValue(null);
const mockDisconnect = vi.fn().mockResolvedValue(null);
const mockNewPage = vi.fn().mockResolvedValue({ goto: mockGoto, setCookie: mockSetCookie });
const mockLaunch = vi.fn().mockResolvedValue({ newPage: mockNewPage, disconnect: mockDisconnect });

vi.mock("puppeteer-core", () => ({
    default: { launch: mockLaunch },
}));

const { openKotPage } = await import("../puppeteer.js");

describe("openKotPage", () => {
    const settings = {
        kingOfTimeUrl: "https://kingoftime-recorder.appspot.com/login?section=1000",
        tokenKey: "htjwt_xxx",
        token: "abc123",
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockNewPage.mockResolvedValue({ goto: mockGoto, setCookie: mockSetCookie });
        mockLaunch.mockResolvedValue({ newPage: mockNewPage, disconnect: mockDisconnect });
    });

    it("Chrome を headless: false で起動する", async () => {
        await openKotPage(settings);
        expect(mockLaunch).toHaveBeenCalledWith({
            executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            headless: false,
        });
    });

    it("kingOfTimeUrl へ 2 回 goto する（domain 確立 → 認証適用）", async () => {
        await openKotPage(settings);
        expect(mockGoto).toHaveBeenCalledTimes(2);
        expect(mockGoto).toHaveBeenNthCalledWith(1, settings.kingOfTimeUrl);
        expect(mockGoto).toHaveBeenNthCalledWith(2, settings.kingOfTimeUrl);
    });

    it("JWT cookie を setCookie でセットする（domain 指定なし）", async () => {
        await openKotPage(settings);
        expect(mockSetCookie).toHaveBeenCalledWith({
            name: settings.tokenKey,
            value: settings.token,
        });
    });

    it("browser.disconnect() を呼び、ウィンドウを残す（close ではない）", async () => {
        await openKotPage(settings);
        expect(mockDisconnect).toHaveBeenCalledOnce();
    });

    it("操作の順序: goto → setCookie → goto → disconnect", async () => {
        const order: string[] = [];
        mockGoto.mockImplementation(() => {
            order.push("goto");
            return Promise.resolve(null);
        });
        mockSetCookie.mockImplementation(() => {
            order.push("setCookie");
            return Promise.resolve(null);
        });
        mockDisconnect.mockImplementation(() => {
            order.push("disconnect");
            return Promise.resolve(null);
        });

        await openKotPage(settings);

        expect(order).toEqual(["goto", "setCookie", "goto", "disconnect"]);
    });
});
