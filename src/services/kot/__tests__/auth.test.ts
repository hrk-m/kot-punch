import { beforeEach, describe, expect, it, vi } from "vitest";

const mockLaunch = vi.fn();

const mockGoto = vi.fn().mockResolvedValue(null);
const mockSetCookie = vi.fn().mockResolvedValue(null);
const mockClose = vi.fn().mockResolvedValue(null);
const mockOnce = vi.fn();

function makePage() {
    return {
        goto: mockGoto,
        setCookie: mockSetCookie,
        once: mockOnce,
    };
}

const mockNewPage = vi.fn().mockResolvedValue(makePage());
const mockPages = vi.fn().mockResolvedValue([makePage()]);

vi.mock("puppeteer", () => ({
    default: { launch: mockLaunch },
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

const { openAuthenticatedKotPage } = await import("../auth");

function resetMocks() {
    vi.clearAllMocks();
    mockGoto.mockResolvedValue(null);
    mockSetCookie.mockResolvedValue(null);
    mockClose.mockResolvedValue(null);
    mockOnce.mockReset();
    mockNewPage.mockResolvedValue(makePage());
    mockPages.mockResolvedValue([makePage()]);
    mockLaunch.mockResolvedValue({ pages: mockPages, newPage: mockNewPage, close: mockClose });
}

describe("openAuthenticatedKotPage", () => {
    const settings = {
        kotPunchUrl: "https://kingoftime-recorder.appspot.com/login?section=1000",
        kotPunchKey: "htjwt_xxx",
        kotPunchToken: "abc123",
    };

    beforeEach(() => {
        resetMocks();
    });

    it("ブラウザを可視モードかつ最大化で起動する", async () => {
        await openAuthenticatedKotPage(settings);

        expect(mockLaunch).toHaveBeenCalledWith({
            headless: false,
            defaultViewport: null,
            args: ["--start-maximized"],
        });
    });

    it("kotPunchUrl へ 2 回 goto し、認証適用後の再遷移は load 完了まで待つ", async () => {
        await openAuthenticatedKotPage(settings);

        expect(mockGoto).toHaveBeenCalledTimes(2);
        expect(mockGoto).toHaveBeenNthCalledWith(1, settings.kotPunchUrl);
        expect(mockGoto).toHaveBeenNthCalledWith(2, settings.kotPunchUrl, { waitUntil: "load" });
    });

    it("既存タブを再利用し、不要な newPage を作らない", async () => {
        await openAuthenticatedKotPage(settings);

        expect(mockPages).toHaveBeenCalledOnce();
        expect(mockNewPage).not.toHaveBeenCalled();
    });

    it("JWT トークンを setCookie でセットする（domain 指定なし）", async () => {
        await openAuthenticatedKotPage(settings);

        expect(mockSetCookie).toHaveBeenCalledWith({
            name: settings.kotPunchKey,
            value: settings.kotPunchToken,
        });
    });

    it("browser と page を返す", async () => {
        const result = await openAuthenticatedKotPage(settings);

        expect(result).toEqual({
            browser: { pages: mockPages, newPage: mockNewPage, close: mockClose },
            page: makePage(),
        });
    });

    it("2回目の goto 中にダイアログが表示されたとき、認証エラーを throw してブラウザを閉じる", async () => {
        type DialogHandler = (dialog: { dismiss(): Promise<void> }) => Promise<void>;
        let capturedHandler: DialogHandler | undefined;
        const dialogDismiss = vi.fn().mockResolvedValue(undefined);
        mockOnce.mockImplementation((event: string, handler: DialogHandler) => {
            if (event === "dialog") {
                capturedHandler = handler;
            }
        });

        let gotoCallCount = 0;
        mockGoto.mockImplementation(async () => {
            gotoCallCount++;
            if (gotoCallCount === 2 && capturedHandler) {
                await capturedHandler({ dismiss: dialogDismiss });
            }
        });

        await expect(openAuthenticatedKotPage(settings)).rejects.toThrow(
            "Authentication failed: dialog appeared while opening KING OF TIME.",
        );
        expect(dialogDismiss).toHaveBeenCalledOnce();
        expect(mockOnce).toHaveBeenCalledWith("dialog", expect.any(Function));
        expect(mockClose).toHaveBeenCalledOnce();
    });

    it("page 操作で例外が発生したらそのまま rethrow しつつ browser.close() でクリーンアップする", async () => {
        const navigationError = new Error("navigation failed");
        mockGoto.mockRejectedValueOnce(navigationError);

        await expect(openAuthenticatedKotPage(settings)).rejects.toBe(navigationError);
        expect(mockClose).toHaveBeenCalledOnce();
    });

    describe("kotPunchHeadless オプション", () => {
        it("kotPunchHeadless=true のとき launch が headless:true で呼ばれる", async () => {
            await openAuthenticatedKotPage({ ...settings, kotPunchHeadless: true });

            expect(mockLaunch).toHaveBeenCalledWith({
                headless: true,
                defaultViewport: null,
                args: ["--start-maximized"],
            });
        });

        it("kotPunchHeadless=false のとき launch が headless:false で呼ばれる", async () => {
            await openAuthenticatedKotPage({ ...settings, kotPunchHeadless: false });

            expect(mockLaunch).toHaveBeenCalledWith({
                headless: false,
                defaultViewport: null,
                args: ["--start-maximized"],
            });
        });

        it("kotPunchHeadless が未設定のとき launch が headless:false で呼ばれる", async () => {
            await openAuthenticatedKotPage(settings);

            expect(mockLaunch).toHaveBeenCalledWith({
                headless: false,
                defaultViewport: null,
                args: ["--start-maximized"],
            });
        });

        it('kotPunchHeadless が文字列 "true" のとき headless:true に正規化する', async () => {
            await openAuthenticatedKotPage({
                ...settings,
                kotPunchHeadless: "true" as unknown as boolean,
            });

            expect(mockLaunch).toHaveBeenCalledWith({
                headless: true,
                defaultViewport: null,
                args: ["--start-maximized"],
            });
        });

        it('kotPunchHeadless が文字列 "false" のとき headless:false に正規化する', async () => {
            await openAuthenticatedKotPage({
                ...settings,
                kotPunchHeadless: "false" as unknown as boolean,
            });

            expect(mockLaunch).toHaveBeenCalledWith({
                headless: false,
                defaultViewport: null,
                args: ["--start-maximized"],
            });
        });
    });
});
