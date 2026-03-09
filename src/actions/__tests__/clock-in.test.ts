import { describe, it, expect, vi, beforeEach } from "vitest";
import { showErrorImage } from "../../lib/showErrorImage.js";

vi.mock("@elgato/streamdeck", () => {
    const action =
        (_definition: { UUID: string }) =>
        <T>(target: T, _context: ClassDecoratorContext): T => {
            return target;
        };

    class SingletonAction<_TSettings = unknown> {
        onWillAppear(_ev: unknown): void | Promise<void> {}
        onKeyUp(_ev: unknown): void | Promise<void> {}
    }

    return { action, SingletonAction };
});

const mockPunchKot = vi.fn().mockResolvedValue(undefined);
vi.mock("../../lib/puppeteer.js", () => ({
    punchKot: mockPunchKot,
}));

const mockGetGlobalSettings = vi.fn();
const mockHasRequiredPunchSettings = vi.fn().mockReturnValue(true);
vi.mock("../../lib/settings.js", () => ({
    getGlobalSettings: mockGetGlobalSettings,
    hasRequiredPunchSettings: mockHasRequiredPunchSettings,
}));

vi.mock("../../lib/showErrorImage.js", () => ({
    showErrorImage: vi.fn().mockResolvedValue(undefined),
}));

const mockNotify = vi.fn();
vi.mock("../../lib/notify.js", () => ({
    notify: mockNotify,
}));

const { ClockIn } = await import("../clock-in.js");

const fullSettings = {
    kotPunchUrl: "https://kingoftime-recorder.appspot.com/login",
    kotPunchKey: "htjwt_xxx",
    kotPunchToken: "abc123",
    kotPunchUsername: "山田 太郎",
    kotPunchPassword: "pass1234",
};

function makeSharedAction() {
    const setState = vi.fn().mockResolvedValue(undefined);
    const showOk = vi.fn().mockResolvedValue(undefined);
    const showAlert = vi.fn().mockResolvedValue(undefined);
    return { action: { setState, showOk, showAlert }, setState, showOk, showAlert };
}

function makeKeyUpEvent(action: object, state: number) {
    return { action, payload: { state } };
}

describe("ClockIn", () => {
    let clockIn: InstanceType<typeof ClockIn>;

    beforeEach(() => {
        vi.clearAllMocks();
        clockIn = new ClockIn();
        mockGetGlobalSettings.mockResolvedValue(fullSettings);
        mockHasRequiredPunchSettings.mockReturnValue(true);
        mockPunchKot.mockResolvedValue(undefined);
    });

    describe("onKeyUp - State 0 打刻成功フロー", () => {
        it("punchKot が成功したとき showOk() + setState(1) が呼ばれる", async () => {
            const { action, showOk, setState } = makeSharedAction();
            const ev = makeKeyUpEvent(action, 0);

            await clockIn.onKeyUp(ev as never);

            expect(mockPunchKot).toHaveBeenCalledWith("#attend", fullSettings);
            expect(showOk).toHaveBeenCalledOnce();
            expect(setState).toHaveBeenCalledWith(1);
            expect(mockNotify).toHaveBeenCalledOnce();
            expect(mockNotify).toHaveBeenCalledWith("出勤打刻が完了しました");
        });
    });

    describe("onKeyUp - State 0 打刻失敗フロー", () => {
        it("punchKot がエラーを throw したとき setState(0) が呼ばれる", async () => {
            const { action, setState } = makeSharedAction();
            const ev = makeKeyUpEvent(action, 0);
            mockPunchKot.mockRejectedValueOnce(new Error("punch failed"));

            await clockIn.onKeyUp(ev as never);

            expect(showErrorImage).toHaveBeenCalledOnce();
            expect(setState).toHaveBeenCalledWith(0);
            expect(mockNotify).not.toHaveBeenCalled();
        });
    });

    describe("onKeyUp - State 1 リセットフロー", () => {
        it("State 1 でボタンを押すと setState(0) が呼ばれ Puppeteer は起動しない", async () => {
            const { action, setState } = makeSharedAction();
            const ev = makeKeyUpEvent(action, 1);

            await clockIn.onKeyUp(ev as never);

            expect(setState).toHaveBeenCalledWith(0);
            expect(mockPunchKot).not.toHaveBeenCalled();
            expect(mockNotify).not.toHaveBeenCalled();
        });
    });

    describe("onKeyUp - 設定未完了フロー", () => {
        it("hasRequiredPunchSettings が false のとき showAlert() が呼ばれ Puppeteer は起動しない", async () => {
            const { action, showAlert } = makeSharedAction();
            const ev = makeKeyUpEvent(action, 0);
            mockHasRequiredPunchSettings.mockReturnValue(false);

            await clockIn.onKeyUp(ev as never);

            expect(showAlert).toHaveBeenCalledOnce();
            expect(mockPunchKot).not.toHaveBeenCalled();
            expect(mockNotify).not.toHaveBeenCalled();
        });
    });

    describe("onKeyUp - 処理中ガード", () => {
        it("_isProcessing=true のとき onKeyUp が即 return する（連打防止）", async () => {
            const { action } = makeSharedAction();
            const ev = makeKeyUpEvent(action, 0);

            // 1回目は処理中になる（punchKot を pending 状態にする）
            let resolvePunch!: () => void;
            mockPunchKot.mockReturnValueOnce(new Promise<void>((resolve) => { resolvePunch = resolve; }));

            const firstCall = clockIn.onKeyUp(ev as never);
            // 2回目は処理中フラグによりブロックされる
            await clockIn.onKeyUp(ev as never);

            expect(mockPunchKot).toHaveBeenCalledTimes(1);
            expect(mockNotify).not.toHaveBeenCalled();

            resolvePunch();
            await firstCall;
            expect(mockNotify).toHaveBeenCalledTimes(1);
            expect(mockNotify).toHaveBeenCalledWith("出勤打刻が完了しました");
        });
    });
});
