import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@elgato/streamdeck", () => {
    const action =
        (_definition: { UUID: string }) =>
        <T>(target: T, _context: ClassDecoratorContext): T =>
            target;

    class SingletonAction<_TSettings = unknown> {
        onKeyUp(_ev: unknown): void | Promise<void> {}
    }

    const logger = { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() };

    return { default: { logger }, action, SingletonAction };
});

const mockGetRequestSettings = vi.fn();
const mockHasRequiredRequestSettings = vi.fn();
vi.mock("../../lib/settings.js", () => ({
    getRequestSettings: mockGetRequestSettings,
    hasRequiredRequestSettings: mockHasRequiredRequestSettings,
}));

const mockOpenRequestPage = vi.fn();
vi.mock("../../lib/puppeteer.js", () => ({
    openRequestPage: mockOpenRequestPage,
}));

const mockShowErrorImage = vi.fn();
vi.mock("../../lib/showErrorImage.js", () => ({
    showErrorImage: mockShowErrorImage,
}));

const { OpenRequest } = await import("../open-request.js");

function makeSharedAction() {
    const showAlert = vi.fn().mockResolvedValue(undefined);
    const setTitle = vi.fn().mockResolvedValue(undefined);
    return { action: { showAlert, setTitle }, showAlert, setTitle };
}

function makeKeyUpEvent(action: object) {
    return { action };
}

describe("OpenRequest", () => {
    let openRequest: InstanceType<typeof OpenRequest>;

    beforeEach(() => {
        openRequest = new OpenRequest();
        vi.clearAllMocks();
    });

    describe("onKeyUp - 成功", () => {
        it("設定済みのとき、openRequestPage を呼ぶ", async () => {
            const { action } = makeSharedAction();
            mockGetRequestSettings.mockResolvedValue({
                requestUrl: "https://s3.ta.kingoftime.jp/admin",
                requestUsername: "admin",
                requestPassword: "pass1234",
            });
            mockHasRequiredRequestSettings.mockReturnValue(true);
            mockOpenRequestPage.mockResolvedValue(undefined);

            await openRequest.onKeyUp(makeKeyUpEvent(action) as never);

            expect(mockOpenRequestPage).toHaveBeenCalledOnce();
        });

        it("openRequestPage には request 用の設定のみを渡す", async () => {
            const { action } = makeSharedAction();
            mockGetRequestSettings.mockResolvedValue({
                requestUrl: "https://s3.ta.kingoftime.jp/admin",
                requestUsername: "admin",
                requestPassword: "pass1234",
            });
            mockHasRequiredRequestSettings.mockReturnValue(true);
            mockOpenRequestPage.mockResolvedValue(undefined);

            await openRequest.onKeyUp(makeKeyUpEvent(action) as never);

            expect(mockOpenRequestPage).toHaveBeenCalledOnce();
            expect(mockOpenRequestPage).toHaveBeenCalledWith({
                requestUrl: "https://s3.ta.kingoftime.jp/admin",
                requestUsername: "admin",
                requestPassword: "pass1234",
            });
        });

        it("成功後に _isProcessing が false に戻り、次回も処理できる", async () => {
            const { action } = makeSharedAction();
            mockGetRequestSettings.mockResolvedValue({
                requestUrl: "https://s3.ta.kingoftime.jp/admin",
                requestUsername: "admin",
                requestPassword: "pass1234",
            });
            mockHasRequiredRequestSettings.mockReturnValue(true);
            mockOpenRequestPage.mockResolvedValue(undefined);

            await openRequest.onKeyUp(makeKeyUpEvent(action) as never);
            await openRequest.onKeyUp(makeKeyUpEvent(action) as never);

            expect(mockOpenRequestPage).toHaveBeenCalledTimes(2);
        });
    });

    describe("onKeyUp - 設定未完了", () => {
        it("設定が未完了のとき showAlert を呼び、openRequestPage を呼ばない", async () => {
            const { action, showAlert } = makeSharedAction();
            mockGetRequestSettings.mockResolvedValue({ requestUrl: "", requestUsername: "", requestPassword: "" });
            mockHasRequiredRequestSettings.mockReturnValue(false);

            await openRequest.onKeyUp(makeKeyUpEvent(action) as never);

            expect(showAlert).toHaveBeenCalledOnce();
            expect(mockOpenRequestPage).not.toHaveBeenCalled();
        });

        it("設定未完了後に _isProcessing が false に戻り、次回も処理できる", async () => {
            const { action } = makeSharedAction();
            mockGetRequestSettings.mockResolvedValue({ requestUrl: "", requestUsername: "", requestPassword: "" });
            mockHasRequiredRequestSettings.mockReturnValue(false);

            await openRequest.onKeyUp(makeKeyUpEvent(action) as never);

            mockHasRequiredRequestSettings.mockReturnValue(true);
            mockOpenRequestPage.mockResolvedValue(undefined);
            await openRequest.onKeyUp(makeKeyUpEvent(action) as never);

            expect(mockOpenRequestPage).toHaveBeenCalledOnce();
        });
    });

    describe("onKeyUp - エラー", () => {
        it("openRequestPage が例外を投げたとき showErrorImage を呼ぶ", async () => {
            const { action } = makeSharedAction();
            mockGetRequestSettings.mockResolvedValue({
                requestUrl: "https://s3.ta.kingoftime.jp/admin",
                requestUsername: "admin",
                requestPassword: "pass1234",
            });
            mockHasRequiredRequestSettings.mockReturnValue(true);
            mockOpenRequestPage.mockRejectedValue(new Error("login failed"));

            await openRequest.onKeyUp(makeKeyUpEvent(action) as never);

            expect(mockShowErrorImage).toHaveBeenCalledOnce();
            expect(mockShowErrorImage).toHaveBeenCalledWith(action);
        });

        it("エラー後に _isProcessing が false に戻り、次回も処理できる", async () => {
            const { action } = makeSharedAction();
            mockGetRequestSettings.mockResolvedValue({
                requestUrl: "https://s3.ta.kingoftime.jp/admin",
                requestUsername: "admin",
                requestPassword: "pass1234",
            });
            mockHasRequiredRequestSettings.mockReturnValue(true);
            mockOpenRequestPage.mockRejectedValueOnce(new Error("login failed"));
            mockOpenRequestPage.mockResolvedValueOnce(undefined);

            await openRequest.onKeyUp(makeKeyUpEvent(action) as never);
            await openRequest.onKeyUp(makeKeyUpEvent(action) as never);

            expect(mockOpenRequestPage).toHaveBeenCalledTimes(2);
        });
    });

    describe("連打防止", () => {
        it("同時に 2 回 onKeyUp が来ても openRequestPage を 1 回しか呼ばない", async () => {
            const { action } = makeSharedAction();
            mockGetRequestSettings.mockResolvedValue({
                requestUrl: "https://s3.ta.kingoftime.jp/admin",
                requestUsername: "admin",
                requestPassword: "pass1234",
            });
            mockHasRequiredRequestSettings.mockReturnValue(true);
            mockOpenRequestPage.mockResolvedValue(undefined);

            await Promise.all([
                openRequest.onKeyUp(makeKeyUpEvent(action) as never),
                openRequest.onKeyUp(makeKeyUpEvent(action) as never),
            ]);

            expect(mockOpenRequestPage).toHaveBeenCalledTimes(1);
        });
    });
});
