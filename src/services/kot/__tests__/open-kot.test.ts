import { beforeEach, describe, expect, it, vi } from "vitest";

const mockOpenAuthenticatedKotPage = vi.fn();

vi.mock("../auth", () => ({
    openAuthenticatedKotPage: mockOpenAuthenticatedKotPage,
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
});
