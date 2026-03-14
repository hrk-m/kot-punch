import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@elgato/streamdeck", () => {
    const action =
        (_definition: { UUID: string }) =>
        <T>(target: T, _context: ClassDecoratorContext): T =>
            target;

    class SingletonAction<_TSettings = unknown> {
        onKeyUp(_ev: unknown): void | Promise<void> {}
    }

    return { action, SingletonAction };
});

const mockGetGlobalSettings = vi.fn();
const mockHasRequiredSettings = vi.fn();
vi.mock("../../platform/streamdeck/settings/punch-settings", () => ({
    getGlobalSettings: mockGetGlobalSettings,
    hasRequiredSettings: mockHasRequiredSettings,
}));

const mockOpenKotPage = vi.fn();
vi.mock("../../services/kot/open-kot", () => ({
    openKotPage: mockOpenKotPage,
}));

const mockShowErrorImage = vi.fn();
vi.mock("../../platform/streamdeck/show-error-image", () => ({
    showErrorImage: mockShowErrorImage,
}));

const mockNotify = vi.fn();
vi.mock("../../platform/desktop/notify", () => ({
    notify: mockNotify,
}));

const { OpenKot } = await import("../open-kot");

function makeSharedAction() {
    const showAlert = vi.fn().mockResolvedValue(undefined);
    const setTitle = vi.fn().mockResolvedValue(undefined);
    return { action: { showAlert, setTitle }, showAlert, setTitle };
}

function makeKeyUpEvent(action: object) {
    return { action };
}

describe("OpenKot", () => {
    let openKot: InstanceType<typeof OpenKot>;

    beforeEach(() => {
        openKot = new OpenKot();
        vi.clearAllMocks();
    });

    describe("onKeyUp - 成功", () => {
        it("設定済みのとき、openKotPage を呼び、タイトルは変更しない", async () => {
            const { action, setTitle } = makeSharedAction();
            mockGetGlobalSettings.mockResolvedValue({
                kotPunchUrl: "https://example.com",
                kotPunchKey: "htjwt_xxx",
                kotPunchToken: "abc",
            });
            mockHasRequiredSettings.mockReturnValue(true);
            mockOpenKotPage.mockResolvedValue(undefined);

            await openKot.onKeyUp(makeKeyUpEvent(action) as never);

            expect(mockOpenKotPage).toHaveBeenCalledOnce();
            expect(setTitle).not.toHaveBeenCalled();
            expect(mockNotify).toHaveBeenCalledOnce();
            expect(mockNotify).toHaveBeenCalledWith("KING OF TIME を開きました");
        });

        it("成功後に _isProcessing が false に戻り、次回も処理できる", async () => {
            const { action } = makeSharedAction();
            mockGetGlobalSettings.mockResolvedValue({
                kotPunchUrl: "https://example.com",
                kotPunchKey: "htjwt_xxx",
                kotPunchToken: "abc",
            });
            mockHasRequiredSettings.mockReturnValue(true);
            mockOpenKotPage.mockResolvedValue(undefined);

            await openKot.onKeyUp(makeKeyUpEvent(action) as never);
            await openKot.onKeyUp(makeKeyUpEvent(action) as never);

            expect(mockOpenKotPage).toHaveBeenCalledTimes(2);
            expect(mockNotify).toHaveBeenCalledTimes(2);
            expect(mockNotify).toHaveBeenNthCalledWith(1, "KING OF TIME を開きました");
            expect(mockNotify).toHaveBeenNthCalledWith(2, "KING OF TIME を開きました");
        });
    });

    describe("onKeyUp - 設定未完了", () => {
        it("設定が未完了のとき showAlert を呼び、openKotPage を呼ばない", async () => {
            const { action, showAlert } = makeSharedAction();
            mockGetGlobalSettings.mockResolvedValue({ kotPunchUrl: "", kotPunchKey: "", kotPunchToken: "" });
            mockHasRequiredSettings.mockReturnValue(false);

            await openKot.onKeyUp(makeKeyUpEvent(action) as never);

            expect(showAlert).toHaveBeenCalledOnce();
            expect(mockOpenKotPage).not.toHaveBeenCalled();
            expect(mockNotify).toHaveBeenCalledWith("全項目必須です。設定を確認してください。");
        });

        it("設定未完了後に _isProcessing が false に戻り、次回も処理できる", async () => {
            const { action } = makeSharedAction();
            mockGetGlobalSettings.mockResolvedValue({ kotPunchUrl: "", kotPunchKey: "", kotPunchToken: "" });
            mockHasRequiredSettings.mockReturnValue(false);

            await openKot.onKeyUp(makeKeyUpEvent(action) as never);

            mockHasRequiredSettings.mockReturnValue(true);
            mockOpenKotPage.mockResolvedValue(undefined);
            await openKot.onKeyUp(makeKeyUpEvent(action) as never);

            expect(mockOpenKotPage).toHaveBeenCalledOnce();
            expect(mockNotify).toHaveBeenCalledTimes(2);
            expect(mockNotify).toHaveBeenCalledWith("KING OF TIME を開きました");
        });
    });

    describe("onKeyUp - エラー", () => {
        it("openKotPage が例外を投げたとき showErrorImage を呼ぶ", async () => {
            const { action } = makeSharedAction();
            mockGetGlobalSettings.mockResolvedValue({
                kotPunchUrl: "https://example.com",
                kotPunchKey: "htjwt_xxx",
                kotPunchToken: "abc",
            });
            mockHasRequiredSettings.mockReturnValue(true);
            mockOpenKotPage.mockRejectedValue(new Error("browser launch failed"));

            await openKot.onKeyUp(makeKeyUpEvent(action) as never);

            expect(mockShowErrorImage).toHaveBeenCalledOnce();
            expect(mockShowErrorImage).toHaveBeenCalledWith(action);
            expect(mockNotify).not.toHaveBeenCalled();
        });

        it("エラー後に _isProcessing が false に戻り、次回も処理できる", async () => {
            const { action } = makeSharedAction();
            mockGetGlobalSettings.mockResolvedValue({
                kotPunchUrl: "https://example.com",
                kotPunchKey: "htjwt_xxx",
                kotPunchToken: "abc",
            });
            mockHasRequiredSettings.mockReturnValue(true);
            mockOpenKotPage.mockRejectedValueOnce(new Error("browser launch failed"));
            mockOpenKotPage.mockResolvedValueOnce(undefined);

            await openKot.onKeyUp(makeKeyUpEvent(action) as never);
            await openKot.onKeyUp(makeKeyUpEvent(action) as never);

            expect(mockOpenKotPage).toHaveBeenCalledTimes(2);
            expect(mockNotify).toHaveBeenCalledTimes(1);
            expect(mockNotify).toHaveBeenCalledWith("KING OF TIME を開きました");
        });
    });

    describe("連打防止", () => {
        it("同時に 2 回 onKeyUp が来ても openKotPage を 1 回しか呼ばない", async () => {
            const { action } = makeSharedAction();
            mockGetGlobalSettings.mockResolvedValue({
                kotPunchUrl: "https://example.com",
                kotPunchKey: "htjwt_xxx",
                kotPunchToken: "abc",
            });
            mockHasRequiredSettings.mockReturnValue(true);
            mockOpenKotPage.mockResolvedValue(undefined);

            await Promise.all([
                openKot.onKeyUp(makeKeyUpEvent(action) as never),
                openKot.onKeyUp(makeKeyUpEvent(action) as never),
            ]);

            expect(mockOpenKotPage).toHaveBeenCalledTimes(1);
            expect(mockNotify).toHaveBeenCalledTimes(1);
            expect(mockNotify).toHaveBeenCalledWith("KING OF TIME を開きました");
        });

    });
});
