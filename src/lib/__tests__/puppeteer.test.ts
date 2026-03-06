import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGoto = vi.fn().mockResolvedValue(null);
const mockSetCookie = vi.fn().mockResolvedValue(null);
const mockDisconnect = vi.fn().mockResolvedValue(null);
const mockOn = vi.fn();
const mockNewPage = vi.fn().mockResolvedValue({ goto: mockGoto, setCookie: mockSetCookie, on: mockOn });
const mockPages = vi.fn().mockResolvedValue([{ goto: mockGoto, setCookie: mockSetCookie, on: mockOn }]);
const mockLaunch = vi.fn().mockResolvedValue({ pages: mockPages, newPage: mockNewPage, disconnect: mockDisconnect });

vi.mock("puppeteer", () => ({
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
        vi.resetAllMocks();
        mockGoto.mockResolvedValue(null);
        mockSetCookie.mockResolvedValue(null);
        mockDisconnect.mockResolvedValue(null);
        mockPages.mockResolvedValue([{ goto: mockGoto, setCookie: mockSetCookie, on: mockOn }]);
        mockNewPage.mockResolvedValue({ goto: mockGoto, setCookie: mockSetCookie, on: mockOn });
        mockLaunch.mockResolvedValue({ pages: mockPages, newPage: mockNewPage, disconnect: mockDisconnect });
    });

    it("ブラウザを可視モードかつ最大化で起動する", async () => {
        await openKotPage(settings);
        expect(mockLaunch).toHaveBeenCalledWith({
            headless: false,
            defaultViewport: null,
            args: ["--start-maximized"],
        });
    });

    it("kingOfTimeUrl へ 2 回 goto する（domain 確立 → 認証適用）", async () => {
        await openKotPage(settings);
        expect(mockGoto).toHaveBeenCalledTimes(2);
        expect(mockGoto).toHaveBeenNthCalledWith(1, settings.kingOfTimeUrl);
        expect(mockGoto).toHaveBeenNthCalledWith(2, settings.kingOfTimeUrl);
    });

    it("既存タブを再利用し、不要な newPage を作らない", async () => {
        await openKotPage(settings);
        expect(mockPages).toHaveBeenCalledOnce();
        expect(mockNewPage).not.toHaveBeenCalled();
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

    it("2回目の goto 中にダイアログが表示されたとき、認証エラーを throw してブラウザを切断する", async () => {
        // page.on("dialog", handler) でハンドラをキャプチャする
        // page.on は 1回目と 2回目の goto の間で呼ばれるため、
        // mockGoto はコールカウンタで 2回目のみダイアログを発火させる
        type DialogHandler = (dialog: { message(): string; dismiss(): Promise<void> }) => Promise<void>;
        let capturedHandler: DialogHandler | undefined;
        const dialogMessage = vi.fn().mockReturnValue("証明書が正しくありません");
        const dialogDismiss = vi.fn().mockResolvedValue(undefined);
        mockOn.mockImplementation((event: string, handler: DialogHandler) => {
            if (event === "dialog") capturedHandler = handler;
        });

        let gotoCallCount = 0;
        mockGoto.mockImplementation(async () => {
            gotoCallCount++;
            if (gotoCallCount === 2 && capturedHandler) {
                await capturedHandler({ message: dialogMessage, dismiss: dialogDismiss });
            }
        });

        await expect(openKotPage(settings)).rejects.toThrow(
            "Authentication failed: dialog appeared while opening KING OF TIME.",
        );
        expect(dialogMessage).not.toHaveBeenCalled();
        expect(dialogDismiss).toHaveBeenCalledOnce();
        expect(mockDisconnect).toHaveBeenCalledOnce();
    });

    it("page 操作で例外が発生したらそのまま rethrow しつつ browser.disconnect() でクリーンアップする", async () => {
        const navigationError = new Error("navigation failed");
        mockGoto.mockRejectedValueOnce(navigationError);

        await expect(openKotPage(settings)).rejects.toBe(navigationError);
        expect(mockDisconnect).toHaveBeenCalledOnce();
    });
});
