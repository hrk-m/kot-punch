import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { showErrorImage } from "../../lib/showErrorImage.js";

const {
    mockCreatePressTracker,
    mockTrackerBegin,
    mockTrackerEnd,
    resetTrackerState,
} = vi.hoisted(() => {
    const startedAt = new Map<string, number>();
    const begin = vi.fn((context: string, now?: number) => {
        startedAt.set(context, now ?? Date.now());
    });
    const end = vi.fn((context: string, now?: number) => {
        const start = startedAt.get(context);
        startedAt.delete(context);
        return start === undefined ? undefined : (now ?? Date.now()) - start;
    });
    const clear = vi.fn((context: string) => {
        startedAt.delete(context);
    });

    return {
        mockCreatePressTracker: vi.fn(() => ({
            begin,
            end,
            clear,
        })),
        mockTrackerBegin: begin,
        mockTrackerEnd: end,
        resetTrackerState: () => startedAt.clear(),
    };
});

vi.mock("@elgato/streamdeck", () => {
    const action =
        (_definition: { UUID: string }) =>
        <T>(target: T, _context: ClassDecoratorContext): T => {
            return target;
        };

    class SingletonAction<_TSettings = unknown> {
        onKeyDown(_ev: unknown): void | Promise<void> {}
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

vi.mock("../../lib/long-press.js", () => ({
    LONG_PRESS_THRESHOLD_MS: 2000,
    createPressTracker: mockCreatePressTracker,
    isLongPress: (durationMs: number, thresholdMs = 2000) => durationMs >= thresholdMs,
}));

const { ClockOut } = await import("../clock-out.js");

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
    return { action: { id: "clock-out-action", setState, showOk, showAlert }, setState, showOk, showAlert };
}

function makeKeyEvent(action: object, state: 0 | 1) {
    return { action, payload: { state } };
}

describe("ClockOut", () => {
    let clockOut: InstanceType<typeof ClockOut>;

    beforeEach(() => {
        vi.clearAllMocks();
        resetTrackerState();
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-03-10T09:00:00Z"));
        clockOut = new ClockOut();
        mockGetGlobalSettings.mockResolvedValue(fullSettings);
        mockHasRequiredPunchSettings.mockReturnValue(true);
        mockPunchKot.mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("onKeyUp - State 0 打刻成功フロー", () => {
        it("punchKot が成功したとき showOk() + setState(1) が呼ばれる", async () => {
            const { action, showOk, setState } = makeSharedAction();
            const ev = makeKeyEvent(action, 0);

            await clockOut.onKeyUp(ev as never);

            expect(mockPunchKot).toHaveBeenCalledWith("#leave", fullSettings);
            expect(showOk).toHaveBeenCalledOnce();
            expect(setState).toHaveBeenCalledWith(1);
            expect(mockNotify).toHaveBeenCalledOnce();
            expect(mockNotify).toHaveBeenCalledWith("退勤打刻が完了しました");
        });
    });

    describe("onKeyUp - State 0 打刻失敗フロー", () => {
        it("punchKot がエラーを throw したとき setState(0) が呼ばれる", async () => {
            const { action, setState } = makeSharedAction();
            const ev = makeKeyEvent(action, 0);
            mockPunchKot.mockRejectedValueOnce(new Error("punch failed"));

            await clockOut.onKeyUp(ev as never);

            expect(showErrorImage).toHaveBeenCalledOnce();
            expect(setState).toHaveBeenCalledWith(0);
            expect(mockNotify).not.toHaveBeenCalled();
        });
    });

    describe("onKeyDown/onKeyUp - 長押し state 更新フロー", () => {
        it("State 0 で 2 秒長押しすると setState(1) のみ呼ばれる", async () => {
            const { action, setState, showOk } = makeSharedAction();
            action.id = "clock-out-long-press-state-0";
            const down = makeKeyEvent(action, 0);
            const up = makeKeyEvent(action, 0);

            await clockOut.onKeyDown(down as never);
            vi.advanceTimersByTime(2000);
            await clockOut.onKeyUp(up as never);

            expect(mockTrackerBegin).toHaveBeenCalledWith("clock-out-long-press-state-0");
            expect(mockTrackerEnd).toHaveBeenCalledWith("clock-out-long-press-state-0");
            expect(setState).toHaveBeenCalledWith(1);
            expect(mockPunchKot).not.toHaveBeenCalled();
            expect(showOk).not.toHaveBeenCalled();
            expect(mockNotify).not.toHaveBeenCalled();
        });

        it("State 1 の短押しは no-op になり state を変えない", async () => {
            const { action, setState } = makeSharedAction();
            action.id = "clock-out-short-press-state-1";
            const down = makeKeyEvent(action, 1);
            const up = makeKeyEvent(action, 1);

            await clockOut.onKeyDown(down as never);
            vi.advanceTimersByTime(1999);
            await clockOut.onKeyUp(up as never);

            expect(setState).not.toHaveBeenCalled();
            expect(mockPunchKot).not.toHaveBeenCalled();
            expect(mockNotify).not.toHaveBeenCalled();
        });

        it("State 1 で 2 秒長押しすると setState(0) のみ呼ばれる", async () => {
            const { action, setState, showOk } = makeSharedAction();
            action.id = "clock-out-long-press-state-1";
            const down = makeKeyEvent(action, 1);
            const up = makeKeyEvent(action, 1);

            await clockOut.onKeyDown(down as never);
            vi.advanceTimersByTime(2000);
            await clockOut.onKeyUp(up as never);

            expect(setState).toHaveBeenCalledWith(0);
            expect(mockPunchKot).not.toHaveBeenCalled();
            expect(showOk).not.toHaveBeenCalled();
            expect(mockNotify).not.toHaveBeenCalled();
        });
    });

    describe("onKeyUp - 設定未完了フロー", () => {
        it("hasRequiredPunchSettings が false のとき showAlert() が呼ばれ Puppeteer は起動しない", async () => {
            const { action, showAlert } = makeSharedAction();
            const ev = makeKeyEvent(action, 0);
            mockHasRequiredPunchSettings.mockReturnValue(false);

            await clockOut.onKeyUp(ev as never);

            expect(showAlert).toHaveBeenCalledOnce();
            expect(mockPunchKot).not.toHaveBeenCalled();
            expect(mockNotify).not.toHaveBeenCalled();
        });
    });

    describe("onKeyUp - 処理中ガード", () => {
        it("_isProcessing=true のとき onKeyUp が即 return する（連打防止）", async () => {
            const { action } = makeSharedAction();
            const ev = makeKeyEvent(action, 0);

            // 1回目は処理中になる（punchKot を pending 状態にする）
            let resolvePunch!: () => void;
            mockPunchKot.mockReturnValueOnce(new Promise<void>((resolve) => { resolvePunch = resolve; }));

            const firstCall = clockOut.onKeyUp(ev as never);
            // 2回目は処理中フラグによりブロックされる
            await clockOut.onKeyUp(ev as never);

            expect(mockPunchKot).toHaveBeenCalledTimes(1);
            expect(mockNotify).not.toHaveBeenCalled();

            resolvePunch();
            await firstCall;
            expect(mockNotify).toHaveBeenCalledTimes(1);

            // finally でフラグがリセットされたことを確認（3回目は通る）
            await clockOut.onKeyUp(ev as never);
            expect(mockPunchKot).toHaveBeenCalledTimes(2);
            expect(mockNotify).toHaveBeenCalledTimes(2);
        });
    });
});
