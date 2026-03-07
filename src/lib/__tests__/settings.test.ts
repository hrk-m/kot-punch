import { describe, it, expect } from "vitest";
import {
    hasRequiredSettings,
    hasRequiredPunchSettings,
    hasRequiredRequestSettings,
} from "../settings.js";
import type { KotPunchSettings } from "../settings.js";

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
