import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetGlobalSettings = vi.fn();

vi.mock("@elgato/streamdeck", () => ({
    default: {
        settings: {
            getGlobalSettings: mockGetGlobalSettings,
        },
    },
}));

const { getRequestSettings } = await import("../settings.js");

describe("getRequestSettings", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("global settings の requestUsername/requestPassword をそのまま返す", async () => {
        mockGetGlobalSettings.mockResolvedValue({
            requestUrl: "https://s3.ta.kingoftime.jp/admin",
            requestUsername: "admin",
            requestPassword: "pass1234",
        });

        await expect(getRequestSettings()).resolves.toEqual({
            requestUrl: "https://s3.ta.kingoftime.jp/admin",
            requestUsername: "admin",
            requestPassword: "pass1234",
        });
    });
});
