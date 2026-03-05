import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

const { ClockOut } = await import("../clock-out.js");

function makeSharedAction() {
    const setTitle = vi.fn().mockResolvedValue(undefined);
    const setSettings = vi.fn().mockResolvedValue(undefined);
    return { action: { setTitle, setSettings }, setTitle, setSettings };
}

function makeKeyDownEvent(action: object, settings: Record<string, unknown>) {
    return { action, payload: { settings: { ...settings } } };
}

function makeKeyUpEvent(action: object, settings: Record<string, unknown>) {
    return { action, payload: { settings: { ...settings } } };
}

describe("ClockOut", () => {
    let clockOut: InstanceType<typeof ClockOut>;

    beforeEach(() => {
        clockOut = new ClockOut();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("onWillAppear", () => {
        it("punched が未設定のとき、タイトルを '退勤' に設定する", async () => {
            const { action, setTitle } = makeSharedAction();
            const ev = { action, payload: { settings: {} } };

            await clockOut.onWillAppear(ev as never);

            expect(setTitle).toHaveBeenCalledOnce();
            expect(setTitle).toHaveBeenCalledWith("退勤");
        });

        it("punched が true のとき、タイトルを '✅' に設定する", async () => {
            const { action, setTitle } = makeSharedAction();
            const ev = { action, payload: { settings: { punched: true } } };

            await clockOut.onWillAppear(ev as never);

            expect(setTitle).toHaveBeenCalledWith("✅");
        });
    });

    describe("onKeyDown + onKeyUp - 短押し: 打刻", () => {
        it("punched が未設定のとき、短押しで punched を true にセットし '✅' を表示する", async () => {
            vi.useFakeTimers();
            const { action, setSettings, setTitle } = makeSharedAction();
            const evDown = makeKeyDownEvent(action, {});
            const evUp = makeKeyUpEvent(action, {});

            clockOut.onKeyDown(evDown as never);
            await vi.advanceTimersByTimeAsync(100);
            await clockOut.onKeyUp(evUp as never);

            expect(setSettings).toHaveBeenCalledWith({ punched: true });
            expect(setTitle).toHaveBeenCalledWith("✅");
        });

        it("punched が true のとき、短押しで setSettings が punched: true で呼ばれる", async () => {
            vi.useFakeTimers();
            const { action, setSettings } = makeSharedAction();
            const evDown = makeKeyDownEvent(action, { punched: true });
            const evUp = makeKeyUpEvent(action, { punched: true });

            clockOut.onKeyDown(evDown as never);
            await vi.advanceTimersByTimeAsync(100);
            await clockOut.onKeyUp(evUp as never);

            expect(setSettings).toHaveBeenCalledWith({ punched: true });
        });
    });

    describe("長押しリセット", () => {
        it("onKeyDown 後 500ms 経過したとき、punched が false にリセットされ '退勤' が表示される", async () => {
            vi.useFakeTimers();
            const { action, setSettings, setTitle } = makeSharedAction();
            const evDown = makeKeyDownEvent(action, { punched: true });

            clockOut.onKeyDown(evDown as never);
            await vi.advanceTimersByTimeAsync(500);

            expect(setSettings).toHaveBeenCalledWith({ punched: false });
            expect(setTitle).toHaveBeenCalledWith("退勤");
        });

        it("onKeyDown 後 500ms 以内に onKeyUp が来たとき、リセットされない", async () => {
            vi.useFakeTimers();
            const { action, setSettings } = makeSharedAction();
            const evDown = makeKeyDownEvent(action, { punched: true });
            const evUp = makeKeyUpEvent(action, { punched: true });

            clockOut.onKeyDown(evDown as never);
            await vi.advanceTimersByTimeAsync(499);
            await clockOut.onKeyUp(evUp as never);

            expect(setSettings).not.toHaveBeenCalledWith({ punched: false });
        });

        it("長押しタイマー発火後に onKeyUp が来ても短押しアクションが実行されない", async () => {
            vi.useFakeTimers();
            const { action, setSettings } = makeSharedAction();
            const evDown = makeKeyDownEvent(action, { punched: false });
            const evUp = makeKeyUpEvent(action, { punched: false });

            clockOut.onKeyDown(evDown as never);
            await vi.advanceTimersByTimeAsync(500);
            await clockOut.onKeyUp(evUp as never);

            expect(setSettings).not.toHaveBeenCalledWith({ punched: true });
        });
    });
});
