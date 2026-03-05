import { describe, it, expect } from "vitest";
import { hasRequiredSettings } from "../settings.js";

describe("hasRequiredSettings", () => {
    it("全て設定済みのとき true を返す", () => {
        expect(
            hasRequiredSettings({
                kingOfTimeUrl: "https://kingoftime-recorder.appspot.com/login",
                tokenKey: "htjwt_xxx",
                token: "abc123",
            }),
        ).toBe(true);
    });

    it("kingOfTimeUrl が未設定のとき false を返す", () => {
        expect(hasRequiredSettings({ tokenKey: "htjwt_xxx", token: "abc123" })).toBe(false);
    });

    it("tokenKey が未設定のとき false を返す", () => {
        expect(hasRequiredSettings({ kingOfTimeUrl: "https://example.com", token: "abc123" })).toBe(false);
    });

    it("token が未設定のとき false を返す", () => {
        expect(hasRequiredSettings({ kingOfTimeUrl: "https://example.com", tokenKey: "htjwt_xxx" })).toBe(false);
    });

    it("kingOfTimeUrl が空文字列のとき false を返す", () => {
        expect(hasRequiredSettings({ kingOfTimeUrl: "", tokenKey: "htjwt_xxx", token: "abc123" })).toBe(false);
    });

    it("tokenKey が空文字列のとき false を返す", () => {
        expect(hasRequiredSettings({ kingOfTimeUrl: "https://example.com", tokenKey: "", token: "abc123" })).toBe(false);
    });

    it("token が空文字列のとき false を返す", () => {
        expect(hasRequiredSettings({ kingOfTimeUrl: "https://example.com", tokenKey: "htjwt_xxx", token: "" })).toBe(false);
    });
});
