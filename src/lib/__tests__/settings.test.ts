import { describe, it, expect } from "vitest";
import { hasRequiredSettings, hasRequiredPunchSettings } from "../settings.js";

const openKotSettings = {
    kingOfTimeUrl: "https://kingoftime-recorder.appspot.com/login",
    tokenKey: "htjwt_xxx",
    token: "abc123",
};

const fullSettings = {
    ...openKotSettings,
    username: "山田 太郎",
    password: "pass1234",
};

describe("hasRequiredSettings", () => {
    it("open-kot 用の必須項目（URL/token）のみで true を返す", () => {
        expect(hasRequiredSettings(openKotSettings)).toBe(true);
    });

    it("kingOfTimeUrl が未設定のとき false を返す", () => {
        const { kingOfTimeUrl: _, ...rest } = openKotSettings;
        expect(hasRequiredSettings(rest)).toBe(false);
    });

    it("tokenKey が未設定のとき false を返す", () => {
        const { tokenKey: _, ...rest } = openKotSettings;
        expect(hasRequiredSettings(rest)).toBe(false);
    });

    it("token が未設定のとき false を返す", () => {
        const { token: _, ...rest } = openKotSettings;
        expect(hasRequiredSettings(rest)).toBe(false);
    });
});

describe("hasRequiredPunchSettings", () => {
    it("全て設定済みのとき true を返す", () => {
        expect(hasRequiredPunchSettings(fullSettings)).toBe(true);
    });

    it("username が未設定のとき false を返す", () => {
        const { username: _, ...rest } = fullSettings;
        expect(hasRequiredPunchSettings(rest)).toBe(false);
    });

    it("password が未設定のとき false を返す", () => {
        const { password: _, ...rest } = fullSettings;
        expect(hasRequiredPunchSettings(rest)).toBe(false);
    });

    it("token が空文字列のとき false を返す", () => {
        expect(hasRequiredPunchSettings({ ...fullSettings, token: "" })).toBe(false);
    });

    it("username が空文字列のとき false を返す", () => {
        expect(hasRequiredPunchSettings({ ...fullSettings, username: "" })).toBe(false);
    });

    it("password が空文字列のとき false を返す", () => {
        expect(hasRequiredPunchSettings({ ...fullSettings, password: "" })).toBe(false);
    });
});
