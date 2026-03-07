import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGoto = vi.fn().mockResolvedValue(null);
const mockSetCookie = vi.fn().mockResolvedValue(null);
const mockDisconnect = vi.fn().mockResolvedValue(null);
const mockClose = vi.fn().mockResolvedValue(null);
const mockOn = vi.fn();
const mockOnce = vi.fn();
const mockClick = vi.fn().mockResolvedValue(null);
const mockType = vi.fn().mockResolvedValue(null);
const mockWaitForNavigation = vi.fn().mockResolvedValue(null);

function makePage() {
    return {
        goto: mockGoto,
        setCookie: mockSetCookie,
        on: mockOn,
        once: mockOnce,
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

const { openKotPage, punchKot, openRequestPage } = await import("../puppeteer.js");

function resetMocks() {
    vi.resetAllMocks();
    mockGoto.mockResolvedValue(null);
    mockSetCookie.mockResolvedValue(null);
    mockDisconnect.mockResolvedValue(null);
    mockClose.mockResolvedValue(null);
    mockOn.mockReset();
    mockOnce.mockReset();
    mockClick.mockResolvedValue(null);
    mockType.mockResolvedValue(null);
    mockWaitForNavigation.mockResolvedValue(null);
    mockPages.mockResolvedValue([makePage()]);
    mockNewPage.mockResolvedValue(makePage());
    mockLaunch.mockResolvedValue({ pages: mockPages, newPage: mockNewPage, disconnect: mockDisconnect, close: mockClose });
}

describe("openKotPage", () => {
    const settings = {
        kotPunchUrl: "https://kingoftime-recorder.appspot.com/login?section=1000",
        kotPunchKey: "htjwt_xxx",
        kotPunchToken: "abc123",
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

    it("kotPunchUrl へ 2 回 goto する（domain 確立 → 認証適用）", async () => {
        await openKotPage(settings);
        expect(mockGoto).toHaveBeenCalledTimes(2);
        expect(mockGoto).toHaveBeenNthCalledWith(1, settings.kotPunchUrl);
        expect(mockGoto).toHaveBeenNthCalledWith(2, settings.kotPunchUrl);
    });

    it("既存タブを再利用し、不要な newPage を作らない", async () => {
        await openKotPage(settings);
        expect(mockPages).toHaveBeenCalledOnce();
        expect(mockNewPage).not.toHaveBeenCalled();
    });

    it("JWT cookie を setCookie でセットする（domain 指定なし）", async () => {
        await openKotPage(settings);
        expect(mockSetCookie).toHaveBeenCalledWith({
            name: settings.kotPunchKey,
            value: settings.kotPunchToken,
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
        // page.once("dialog", handler) でハンドラをキャプチャする
        // page.once は 1回目と 2回目の goto の間で呼ばれるため、
        // mockGoto はコールカウンタで 2回目のみダイアログを発火させる
        type DialogHandler = (dialog: { message(): string; dismiss(): Promise<void> }) => Promise<void>;
        let capturedHandler: DialogHandler | undefined;
        const dialogMessage = vi.fn().mockReturnValue("証明書が正しくありません");
        const dialogDismiss = vi.fn().mockResolvedValue(undefined);
        mockOnce.mockImplementation((event: string, handler: DialogHandler) => {
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
        expect(mockOnce).toHaveBeenCalledWith("dialog", expect.any(Function));
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

describe("openRequestPage", () => {
    const settings = {
        requestUrl: "https://s3.ta.kingoftime.jp/admin",
        requestUsername: "admin",
        requestPassword: "pass1234",
    };

    beforeEach(() => {
        resetMocks();
    });

    it("ブラウザを可視モードかつ最大化で起動する", async () => {
        await openRequestPage(settings);
        expect(mockLaunch).toHaveBeenCalledWith({
            headless: false,
            defaultViewport: null,
            args: ["--start-maximized"],
        });
    });

    it("requestUrl が設定されているときその URL へアクセスする", async () => {
        await openRequestPage({ ...settings, requestUrl: "https://login.ta.kingoftime.jp/admin" });
        expect(mockGoto).toHaveBeenCalledWith("https://login.ta.kingoftime.jp/admin");
    });

    it("既存タブを再利用し、不要な newPage を作らない", async () => {
        await openRequestPage(settings);
        expect(mockPages).toHaveBeenCalledOnce();
        expect(mockNewPage).not.toHaveBeenCalled();
    });

    it("操作順序: goto → type(#login_id) → type(#login_password) → click(submit) → disconnect", async () => {
        const order: string[] = [];
        mockGoto.mockImplementation(() => { order.push("goto"); return Promise.resolve(null); });
        mockType.mockImplementation((selector: string) => { order.push(`type(${selector})`); return Promise.resolve(null); });
        mockClick.mockImplementation(() => { order.push("click"); return Promise.resolve(null); });
        mockWaitForNavigation.mockImplementation(() => { order.push("nav"); return Promise.resolve(null); });
        mockDisconnect.mockImplementation(() => { order.push("disconnect"); return Promise.resolve(null); });

        await openRequestPage(settings);

        // Promise.all の評価順: waitForNavigation(nav) → click(#login_button) → 両完了後 disconnect
        expect(order).toEqual(["goto", "type(#login_id)", "type(#login_password)", "nav", "click", "disconnect"]);
    });

    it("#login_id に requestUsername を入力する", async () => {
        await openRequestPage(settings);
        expect(mockType).toHaveBeenCalledWith("#login_id", settings.requestUsername);
    });

    it("#login_password に requestPassword を入力する", async () => {
        await openRequestPage(settings);
        expect(mockType).toHaveBeenCalledWith("#login_password", settings.requestPassword);
    });

    it("#login_button クリックと waitForNavigation を並列実行する", async () => {
        await openRequestPage(settings);
        expect(mockClick).toHaveBeenCalledWith("#login_button");
        expect(mockWaitForNavigation).toHaveBeenCalledWith({ waitUntil: "networkidle0" });
    });

    it("browser.disconnect() を呼び、ウィンドウを残す（close ではない）", async () => {
        await openRequestPage(settings);
        expect(mockDisconnect).toHaveBeenCalledOnce();
        expect(mockClose).not.toHaveBeenCalled();
    });

    it("例外発生時は browser.close() でクリーンアップし、エラーを rethrow する", async () => {
        const navError = new Error("navigation timeout");
        mockWaitForNavigation.mockRejectedValueOnce(navError);

        await expect(openRequestPage(settings)).rejects.toBe(navError);
        expect(mockClose).toHaveBeenCalledOnce();
        expect(mockDisconnect).not.toHaveBeenCalled();
    });
});

describe("punchKot", () => {
    const settings = {
        kotPunchUrl: "https://kingoftime-recorder.appspot.com/login?section=1000",
        kotPunchKey: "htjwt_xxx",
        kotPunchToken: "abc123",
        kotPunchUsername: "山田 太郎",
        kotPunchPassword: "pass1234",
    };

    beforeEach(() => {
        resetMocks();
    });

    it("kotPunchDryRun=false: #attend クリック → ユーザー選択 → パスワード入力 → submit が実行される", async () => {
        await punchKot("#attend", settings);

        const clickArgs = mockClick.mock.calls.map((c) => c[0]);
        expect(clickArgs).toContain("#attend");
        expect(clickArgs).toContain(`::-p-text(${settings.kotPunchUsername})`);
        expect(clickArgs).toContain("button[type=submit]");
        expect(mockType).toHaveBeenCalledWith("input[type=password]", settings.kotPunchPassword, { delay: 0 });
        expect(mockWaitForNavigation).toHaveBeenCalledWith({ waitUntil: "networkidle0" });
        expect(mockClose).toHaveBeenCalledOnce();
        expect(mockDisconnect).not.toHaveBeenCalled();
    });

    it("kotPunchDryRun=false: 操作順序が #attend → ユーザー選択 → パスワード入力 → submit になる", async () => {
        const order: string[] = [];
        mockClick.mockImplementation((selector: string) => {
            if (selector === "#attend") {
                order.push("attend");
            } else if (selector === `::-p-text(${settings.kotPunchUsername})`) {
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

    it("kotPunchDryRun=true: submit クリックがスキップされる", async () => {
        await punchKot("#attend", { ...settings, kotPunchDryRun: true });

        const clickArgs = mockClick.mock.calls.map((c) => c[0]);
        expect(clickArgs).not.toContain("button[type=submit]");
        expect(mockType).toHaveBeenCalledWith("input[type=password]", settings.kotPunchPassword, { delay: 100 });
        expect(mockDisconnect).toHaveBeenCalledOnce();
        expect(mockClose).not.toHaveBeenCalled();
    });

    it("ユーザー名に ) が含まれても ::-p-text セレクタをエスケープしてクリックできる", async () => {
        await punchKot("#attend", { ...settings, kotPunchUsername: "山田(太郎)", kotPunchDryRun: true });

        const clickArgs = mockClick.mock.calls.map((c) => c[0]);
        expect(clickArgs).toContain("::-p-text(山田(太郎\\))");
    });

    it("#leave 指定時に #leave ボタンをクリックする", async () => {
        await punchKot("#leave", { ...settings, kotPunchDryRun: true });

        const clickArgs = mockClick.mock.calls.map((c) => c[0]);
        expect(clickArgs).toContain("#leave");
        expect(mockDisconnect).toHaveBeenCalledOnce();
    });

    it("認証失敗（dialog イベント）: エラーが throw されブラウザが閉じる", async () => {
        type DialogHandler = (dialog: { message(): string; dismiss(): Promise<void> }) => Promise<void>;
        let capturedHandler: DialogHandler | undefined;
        mockOnce.mockImplementation((event: string, handler: DialogHandler) => {
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
        expect(mockOnce).toHaveBeenCalledWith("dialog", expect.any(Function));
        expect(mockClose).toHaveBeenCalledOnce();
        expect(mockClick).not.toHaveBeenCalled();
    });
});
