import { beforeEach, describe, expect, it, vi } from "vitest";

const mockOpenAuthenticatedKotPage = vi.fn();
const mockInfo = vi.fn();

vi.mock("../auth", () => ({
    openAuthenticatedKotPage: mockOpenAuthenticatedKotPage,
}));

vi.mock("../../../platform/streamdeck/logger", () => ({
    logger: {
        puppeteer: {
            debug: vi.fn(),
            info: mockInfo,
            warn: vi.fn(),
            error: vi.fn(),
        },
    },
}));

const { openKotPage } = await import("../open-kot");

describe("openKotPage", () => {
    const disconnect = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn().mockResolvedValue(undefined);
    const browser = { disconnect, close };

    beforeEach(() => {
        vi.clearAllMocks();
        mockOpenAuthenticatedKotPage.mockResolvedValue({ browser, page: {} });
    });

    it("認証済みページを開いて browser.disconnect() を呼ぶ", async () => {
        await openKotPage({
            kotPunchUrl: "https://example.com",
            kotPunchKey: "key",
            kotPunchToken: "token",
        });

        expect(mockOpenAuthenticatedKotPage).toHaveBeenCalledOnce();
        expect(disconnect).toHaveBeenCalledOnce();
        expect(close).not.toHaveBeenCalled();
    });

    it("kotPunchHeadless=true を渡しても open-kot は headless:false で認証ページを開く", async () => {
        await openKotPage({
            kotPunchUrl: "https://example.com",
            kotPunchKey: "key",
            kotPunchToken: "token",
            kotPunchHeadless: true,
        });

        expect(mockOpenAuthenticatedKotPage).toHaveBeenCalledWith({
            kotPunchUrl: "https://example.com",
            kotPunchKey: "key",
            kotPunchToken: "token",
            kotPunchHeadless: false,
        });
    });

    it("disconnect に失敗したら browser.close() でクリーンアップして rethrow する", async () => {
        const disconnectError = new Error("disconnect failed");
        disconnect.mockRejectedValueOnce(disconnectError);

        await expect(
            openKotPage({
                kotPunchUrl: "https://example.com",
                kotPunchKey: "key",
                kotPunchToken: "token",
            }),
        ).rejects.toBe(disconnectError);
        expect(close).toHaveBeenCalledOnce();
    });

    it("disconnect 成功後に後続処理で失敗しても close しない", async () => {
        const logError = new Error("log failed");
        mockInfo.mockImplementationOnce(() => {
            throw logError;
        });

        await expect(
            openKotPage({
                kotPunchUrl: "https://example.com",
                kotPunchKey: "key",
                kotPunchToken: "token",
            }),
        ).rejects.toBe(logError);
        expect(disconnect).toHaveBeenCalledOnce();
        expect(close).not.toHaveBeenCalled();
    });
});
