import { beforeEach, describe, expect, it, vi } from "vitest";
import type { KotPunchSettings } from "../punch-settings";

const mockGetGlobalSettings = vi.fn();

vi.mock("@elgato/streamdeck", () => ({
    default: {
        settings: {
            getGlobalSettings: mockGetGlobalSettings,
        },
    },
}));

const { getGlobalSettings, hasRequiredPunchSettings, hasRequiredSettings } = await import("../punch-settings");

const openKotSettings: KotPunchSettings = {
    kotPunchUrl: "https://kingoftime-recorder.appspot.com/login",
    kotPunchKey: "htjwt_xxx",
    kotPunchToken: "abc123",
};

const fullSettings = {
    ...openKotSettings,
    kotPunchUsername: "山田 太郎",
    kotPunchPassword: "pass1234",
};

describe("getGlobalSettings", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("global settings をそのまま返す", async () => {
        mockGetGlobalSettings.mockResolvedValue(fullSettings);

        await expect(getGlobalSettings()).resolves.toEqual(fullSettings);
    });
});

describe("hasRequiredSettings", () => {
    it("open-kot 用の必須項目（URL/token）のみで true を返す", () => {
        expect(hasRequiredSettings(openKotSettings)).toBe(true);
    });

    it("kotPunchUrl が未設定のとき false を返す", () => {
        const { kotPunchUrl: _, ...rest } = openKotSettings;
        expect(hasRequiredSettings(rest)).toBe(false);
    });

    it("kotPunchKey が未設定のとき false を返す", () => {
        const { kotPunchKey: _, ...rest } = openKotSettings;
        expect(hasRequiredSettings(rest)).toBe(false);
    });

    it("kotPunchToken が未設定のとき false を返す", () => {
        const { kotPunchToken: _, ...rest } = openKotSettings;
        expect(hasRequiredSettings(rest)).toBe(false);
    });
});

describe("hasRequiredPunchSettings", () => {
    it("全て設定済みのとき true を返す", () => {
        expect(hasRequiredPunchSettings(fullSettings)).toBe(true);
    });

    it("kotPunchUsername が未設定のとき false を返す", () => {
        const { kotPunchUsername: _, ...rest } = fullSettings;
        expect(hasRequiredPunchSettings(rest)).toBe(false);
    });

    it("kotPunchPassword が未設定のとき false を返す", () => {
        const { kotPunchPassword: _, ...rest } = fullSettings;
        expect(hasRequiredPunchSettings(rest)).toBe(false);
    });

    it("kotPunchToken が空文字列のとき false を返す", () => {
        expect(hasRequiredPunchSettings({ ...fullSettings, kotPunchToken: "" })).toBe(false);
    });

    it("kotPunchUsername が空文字列のとき false を返す", () => {
        expect(hasRequiredPunchSettings({ ...fullSettings, kotPunchUsername: "" })).toBe(false);
    });

    it("kotPunchPassword が空文字列のとき false を返す", () => {
        expect(hasRequiredPunchSettings({ ...fullSettings, kotPunchPassword: "" })).toBe(false);
    });
});
