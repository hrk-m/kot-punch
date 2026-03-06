import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGoto = vi.fn().mockResolvedValue(null);
const mockSetCookie = vi.fn().mockResolvedValue(null);
const mockDisconnect = vi.fn().mockResolvedValue(null);
const mockClose = vi.fn().mockResolvedValue(null);
const mockOn = vi.fn();
const mockClick = vi.fn().mockResolvedValue(null);
const mockType = vi.fn().mockResolvedValue(null);
const mockWaitForNavigation = vi.fn().mockResolvedValue(null);

function makePage() {
    return {
        goto: mockGoto,
        setCookie: mockSetCookie,
        on: mockOn,
        click: mockClick,
        type: mockType,
        waitForNavigation: mockWaitForNavigation,
    };
}

const mockNewPage = vi.fn().mockResolvedValue(makePage());
const mockPages = vi.fn().mockResolvedValue([makePage()]);
const mockLaunch = vi.fn().mockResolvedValue({ pages: mockPages, newPage: mockNewPage, disconnect: mockDisconnect, close: mockClose });

vi.mock("puppeteer", () => ({
    default: { launch: mockLaunch },
}));

const { openKotPage, punchKot } = await import("../puppeteer.js");

function resetMocks() {
    vi.resetAllMocks();
    mockGoto.mockResolvedValue(null);
    mockSetCookie.mockResolvedValue(null);
    mockDisconnect.mockResolvedValue(null);
    mockClose.mockResolvedValue(null);
    mockClick.mockResolvedValue(null);
    mockType.mockResolvedValue(null);
    mockWaitForNavigation.mockResolvedValue(null);
    mockPages.mockResolvedValue([makePage()]);
    mockNewPage.mockResolvedValue(makePage());
    mockLaunch.mockResolvedValue({ pages: mockPages, newPage: mockNewPage, disconnect: mockDisconnect, close: mockClose });
}

describe("openKotPage", () => {
    const settings = {
        kingOfTimeUrl: "https://kingoftime-recorder.appspot.com/login?section=1000",
        tokenKey: "htjwt_xxx",
        token: "abc123",
    };

    beforeEach(() => {
        resetMocks();
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

    it("2回目の goto 中にダイアログが表示されたとき、認証エラーを throw してブラウザを閉じる", async () => {
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
        expect(mockClose).toHaveBeenCalledOnce();
        expect(mockDisconnect).not.toHaveBeenCalled();
    });

    it("page 操作で例外が発生したらそのまま rethrow しつつ browser.close() でクリーンアップする", async () => {
        const navigationError = new Error("navigation failed");
        mockGoto.mockRejectedValueOnce(navigationError);

        await expect(openKotPage(settings)).rejects.toBe(navigationError);
        expect(mockClose).toHaveBeenCalledOnce();
        expect(mockDisconnect).not.toHaveBeenCalled();
    });
});

describe("punchKot", () => {
    const settings = {
        kingOfTimeUrl: "https://kingoftime-recorder.appspot.com/login?section=1000",
        tokenKey: "htjwt_xxx",
        token: "abc123",
        username: "山田 太郎",
        password: "pass1234",
    };

    beforeEach(() => {
        resetMocks();
    });

    it("dryRun=false: #attend クリック → ユーザー選択 → パスワード入力 → submit が実行される", async () => {
        await punchKot("#attend", settings);

        const clickArgs = mockClick.mock.calls.map((c) => c[0]);
        expect(clickArgs).toContain("#attend");
        expect(clickArgs).toContain(`::-p-text(${settings.username})`);
        expect(clickArgs).toContain("button[type=submit]");
        expect(mockType).toHaveBeenCalledWith("input[type=password]", settings.password, { delay: 100 });
        expect(mockWaitForNavigation).toHaveBeenCalledWith({ waitUntil: "networkidle0" });
        expect(mockClose).toHaveBeenCalledOnce();
        expect(mockDisconnect).not.toHaveBeenCalled();
    });

    it("dryRun=false: 操作順序が #attend → ユーザー選択 → パスワード入力 → submit になる", async () => {
        const order: string[] = [];
        mockClick.mockImplementation((selector: string) => {
            if (selector === "#attend") {
                order.push("attend");
            } else if (selector === `::-p-text(${settings.username})`) {
                order.push("selectUser");
            } else if (selector === "button[type=submit]") {
                order.push("submit");
            }
            return Promise.resolve(null);
        });
        mockType.mockImplementation(() => {
            order.push("typePassword");
            return Promise.resolve(null);
        });

        await punchKot("#attend", settings);

        expect(order).toEqual(["attend", "selectUser", "typePassword", "submit"]);
    });

    it("dryRun=true: submit クリックがスキップされる", async () => {
        await punchKot("#attend", { ...settings, dryRun: true });

        const clickArgs = mockClick.mock.calls.map((c) => c[0]);
        expect(clickArgs).not.toContain("button[type=submit]");
        expect(mockDisconnect).toHaveBeenCalledOnce();
        expect(mockClose).not.toHaveBeenCalled();
    });

    it("#leave 指定時に #leave ボタンをクリックする", async () => {
        await punchKot("#leave", { ...settings, dryRun: true });

        const clickArgs = mockClick.mock.calls.map((c) => c[0]);
        expect(clickArgs).toContain("#leave");
        expect(mockDisconnect).toHaveBeenCalledOnce();
    });

    it("認証失敗（dialog イベント）: エラーが throw されブラウザが閉じる", async () => {
        type DialogHandler = (dialog: { message(): string; dismiss(): Promise<void> }) => Promise<void>;
        let capturedHandler: DialogHandler | undefined;
        mockOn.mockImplementation((event: string, handler: DialogHandler) => {
            if (event === "dialog") capturedHandler = handler;
        });

        let gotoCallCount = 0;
        mockGoto.mockImplementation(async () => {
            gotoCallCount++;
            if (gotoCallCount === 2 && capturedHandler) {
                await capturedHandler({ message: vi.fn().mockReturnValue(""), dismiss: vi.fn().mockResolvedValue(undefined) });
            }
        });

        await expect(punchKot("#attend", settings)).rejects.toThrow(
            "Authentication failed: dialog appeared while opening KING OF TIME.",
        );
        expect(mockClose).toHaveBeenCalledOnce();
        expect(mockClick).not.toHaveBeenCalled();
    });
});
