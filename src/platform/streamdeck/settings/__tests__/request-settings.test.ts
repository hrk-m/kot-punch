import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetGlobalSettings = vi.fn();

vi.mock("@elgato/streamdeck", () => ({
    default: {
        settings: {
            getGlobalSettings: mockGetGlobalSettings,
        },
    },
}));

const { getRequestSettings, hasRequiredRequestSettings } = await import("../request-settings");

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

describe("hasRequiredRequestSettings", () => {
    const requestSettings = {
        requestUrl: "https://s3.ta.kingoftime.jp/admin",
        requestUsername: "admin",
        requestPassword: "pass1234",
    };

    it("requestUrl / requestUsername / requestPassword が設定済みのとき true を返す", () => {
        expect(hasRequiredRequestSettings(requestSettings)).toBe(true);
    });

    it("requestUrl が未設定のとき false を返す", () => {
        const { requestUrl: _, ...rest } = requestSettings;
        expect(hasRequiredRequestSettings(rest)).toBe(false);
    });

    it("requestUsername が未設定のとき false を返す", () => {
        const { requestUsername: _, ...rest } = requestSettings;
        expect(hasRequiredRequestSettings(rest)).toBe(false);
    });

    it("requestPassword が未設定のとき false を返す", () => {
        const { requestPassword: _, ...rest } = requestSettings;
        expect(hasRequiredRequestSettings(rest)).toBe(false);
    });

    it("requestUrl が空文字列のとき false を返す", () => {
        expect(hasRequiredRequestSettings({ ...requestSettings, requestUrl: "" })).toBe(false);
    });

    it("requestUsername が空文字列のとき false を返す", () => {
        expect(hasRequiredRequestSettings({ ...requestSettings, requestUsername: "" })).toBe(false);
    });

    it("requestPassword が空文字列のとき false を返す", () => {
        expect(hasRequiredRequestSettings({ ...requestSettings, requestPassword: "" })).toBe(false);
    });
});
