import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { showErrorImage } from "../../lib/showErrorImage.js";

const {
    mockCreatePressTracker,
    mockTrackerBegin,
    mockTrackerEnd,
    resetTrackerState,
} = vi.hoisted(() => {
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const triggered = new Set<string>();

    const clearTimer = (context: string) => {
        const timer = timers.get(context);
        if (timer !== undefined) {
            clearTimeout(timer);
            timers.delete(context);
        }
    };

    const begin = vi.fn((context: string, onLongPress: () => Promise<void> | void) => {
        clearTimer(context);
        triggered.delete(context);
        const timer = setTimeout(() => {
            timers.delete(context);
            triggered.add(context);
            if (typeof onLongPress === "function") {
                void onLongPress();
            }
        }, 2000);
        timers.set(context, timer);
    });
    const end = vi.fn((context: string) => {
        clearTimer(context);
        const wasTriggered = triggered.has(context);
        triggered.delete(context);
        return wasTriggered;
    });
    const clear = vi.fn((context: string) => {
        clearTimer(context);
        triggered.delete(context);
    });
    const hasTriggered = vi.fn((context: string) => triggered.has(context));

    return {
        mockCreatePressTracker: vi.fn(() => ({
            begin,
            end,
            clear,
            hasTriggered,
        })),
        mockTrackerBegin: begin,
        mockTrackerEnd: end,
        resetTrackerState: () => {
            for (const timer of timers.values()) {
                clearTimeout(timer);
            }
            timers.clear();
            triggered.clear();
        },
    };
});

vi.mock("@elgato/streamdeck", () => {
    const action =
        (_definition: { UUID: string }) =>
        <T>(target: T, _context: ClassDecoratorContext): T => {
            return target;
        };

    class SingletonAction<_TSettings = unknown> {
        onWillAppear(_ev: unknown): void | Promise<void> {}
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
    return { action: { id: "clock-in-action", setState, showOk, showAlert }, setState, showOk, showAlert };
}

function makeKeyEvent(action: object, state: 0 | 1) {
    return { action, payload: { state } };
}

describe("ClockIn", () => {
    let clockIn: InstanceType<typeof ClockIn>;

    beforeEach(() => {
        vi.clearAllMocks();
        resetTrackerState();
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-03-10T09:00:00Z"));
        clockIn = new ClockIn();
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
            const down = makeKeyEvent(action, 0);
            const up = makeKeyEvent(action, 0);

            await clockIn.onKeyDown(down as never);
            await vi.advanceTimersByTimeAsync(1999);
            await clockIn.onKeyUp(up as never);

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
            const down = makeKeyEvent(action, 0);
            const up = makeKeyEvent(action, 0);
            mockPunchKot.mockRejectedValueOnce(new Error("punch failed"));

            await clockIn.onKeyDown(down as never);
            await vi.advanceTimersByTimeAsync(1999);
            await clockIn.onKeyUp(up as never);

            expect(showErrorImage).toHaveBeenCalledOnce();
            expect(setState).toHaveBeenCalledWith(0);
            expect(mockNotify).not.toHaveBeenCalled();
        });
    });

    describe("onKeyDown/onKeyUp - 長押し state 更新フロー", () => {
        it("State 0 で 2 秒到達時に setState(1) のみ呼ばれ、onKeyUp は no-op", async () => {
            const { action, setState, showOk } = makeSharedAction();
            action.id = "clock-in-long-press-state-0";
            const down = makeKeyEvent(action, 0);
            const up = makeKeyEvent(action, 0);

            await clockIn.onKeyDown(down as never);
            await vi.advanceTimersByTimeAsync(1999);
            expect(setState).not.toHaveBeenCalled();

            await vi.advanceTimersByTimeAsync(1);
            expect(mockTrackerBegin).toHaveBeenCalledWith(
                "clock-in-long-press-state-0",
                expect.any(Function),
            );
            await clockIn.onKeyUp(up as never);

            expect(mockTrackerEnd).toHaveBeenCalledWith("clock-in-long-press-state-0");
            expect(setState).toHaveBeenCalledTimes(1);
            expect(setState).toHaveBeenCalledWith(1);
            expect(mockPunchKot).not.toHaveBeenCalled();
            expect(showOk).not.toHaveBeenCalled();
            expect(mockNotify).not.toHaveBeenCalled();
            expect(showErrorImage).not.toHaveBeenCalled();
        });

        it("State 1 の短押しは no-op になり state を変えない", async () => {
            const { action, setState } = makeSharedAction();
            action.id = "clock-in-short-press-state-1";
            const down = makeKeyEvent(action, 1);
            const up = makeKeyEvent(action, 1);

            await clockIn.onKeyDown(down as never);
            await vi.advanceTimersByTimeAsync(1999);
            await clockIn.onKeyUp(up as never);

            expect(setState).not.toHaveBeenCalled();
            expect(mockPunchKot).not.toHaveBeenCalled();
            expect(mockNotify).not.toHaveBeenCalled();
        });

        it("State 1 で 2 秒到達時に setState(0) のみ呼ばれ、onKeyUp は no-op", async () => {
            const { action, setState, showOk } = makeSharedAction();
            action.id = "clock-in-long-press-state-1";
            const down = makeKeyEvent(action, 1);
            const up = makeKeyEvent(action, 1);

            await clockIn.onKeyDown(down as never);
            await vi.advanceTimersByTimeAsync(2000);
            await clockIn.onKeyUp(up as never);

            expect(setState).toHaveBeenCalledTimes(1);
            expect(setState).toHaveBeenCalledWith(0);
            expect(mockPunchKot).not.toHaveBeenCalled();
            expect(showOk).not.toHaveBeenCalled();
            expect(mockNotify).not.toHaveBeenCalled();
        });
    });

    describe("onKeyUp - 設定未完了フロー", () => {
        it("hasRequiredPunchSettings が false のとき showAlert() が呼ばれ Puppeteer は起動しない", async () => {
            const { action, showAlert } = makeSharedAction();
            const down = makeKeyEvent(action, 0);
            const up = makeKeyEvent(action, 0);
            mockHasRequiredPunchSettings.mockReturnValue(false);

            await clockIn.onKeyDown(down as never);
            await vi.advanceTimersByTimeAsync(1999);
            await clockIn.onKeyUp(up as never);

            expect(showAlert).toHaveBeenCalledOnce();
            expect(mockPunchKot).not.toHaveBeenCalled();
            expect(mockNotify).toHaveBeenCalledWith("全項目必須です。設定を確認してください。");
        });
    });

    describe("onKeyUp - 処理中ガード", () => {
        it("_isProcessing=true のとき onKeyUp が即 return する（連打防止）", async () => {
            const { action } = makeSharedAction();
            const firstDown = makeKeyEvent(action, 0);
            const firstUp = makeKeyEvent(action, 0);
            const secondDown = makeKeyEvent(action, 0);
            const secondUp = makeKeyEvent(action, 0);

            // 1回目は処理中になる（punchKot を pending 状態にする）
            let resolvePunch!: () => void;
            mockPunchKot.mockReturnValueOnce(new Promise<void>((resolve) => { resolvePunch = resolve; }));

            await clockIn.onKeyDown(firstDown as never);
            await vi.advanceTimersByTimeAsync(1999);
            const firstCall = clockIn.onKeyUp(firstUp as never);
            // 2回目は処理中フラグによりブロックされる
            await clockIn.onKeyDown(secondDown as never);
            await clockIn.onKeyUp(secondUp as never);

            expect(mockPunchKot).toHaveBeenCalledTimes(1);
            expect(mockNotify).not.toHaveBeenCalled();

            resolvePunch();
            await firstCall;
            expect(mockNotify).toHaveBeenCalledTimes(1);
            expect(mockNotify).toHaveBeenCalledWith("出勤打刻が完了しました");
        });
    });
});
