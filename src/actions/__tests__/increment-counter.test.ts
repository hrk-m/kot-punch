import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// @elgato/streamdeck はランタイム環境（Stream Deck プロセス）への接続が必要なため、
// ユニットテストではモックに差し替える。
vi.mock("@elgato/streamdeck", () => {
    // TC39 stage 3 デコレータ形式: (definition) => (target, context) => target
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

// モック後に対象モジュールをインポート
const { IncrementCounter } = await import("../increment-counter.js");

// 共有 action スタブヘルパー
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

describe("IncrementCounter", () => {
    let counter: InstanceType<typeof IncrementCounter>;

    beforeEach(() => {
        counter = new IncrementCounter();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("onWillAppear", () => {
        it("count が未設定のとき、タイトルを '1' に設定する", async () => {
            const { action, setTitle } = makeSharedAction();
            const ev = { action, payload: { settings: {} } };

            await counter.onWillAppear(ev as never);

            expect(setTitle).toHaveBeenCalledOnce();
            expect(setTitle).toHaveBeenCalledWith("1");
        });

        it("count が設定済みのとき、その値をタイトルに設定する", async () => {
            const { action, setTitle } = makeSharedAction();
            const ev = { action, payload: { settings: { count: 9 } } };

            await counter.onWillAppear(ev as never);

            expect(setTitle).toHaveBeenCalledWith("9");
        });
    });

    describe("onKeyDown + onKeyUp - 短押し: 3 倍カウントアップ", () => {
        it("count が 0 のとき、短押しで count を 1 にセットする", async () => {
            vi.useFakeTimers();
            const { action, setSettings, setTitle } = makeSharedAction();
            const evDown = makeKeyDownEvent(action, { count: 0 });
            const evUp = makeKeyUpEvent(action, { count: 0 });

            counter.onKeyDown(evDown as never);
            await vi.advanceTimersByTimeAsync(100); // 短押し（500ms 未満）
            await counter.onKeyUp(evUp as never);

            expect(setSettings).toHaveBeenCalledWith({ count: 1 });
            expect(setTitle).toHaveBeenCalledWith("1");
        });

        it("count が 1 のとき、短押しで count を 3 にセットする", async () => {
            vi.useFakeTimers();
            const { action, setSettings, setTitle } = makeSharedAction();
            const evDown = makeKeyDownEvent(action, { count: 1 });
            const evUp = makeKeyUpEvent(action, { count: 1 });

            counter.onKeyDown(evDown as never);
            await vi.advanceTimersByTimeAsync(100);
            await counter.onKeyUp(evUp as never);

            expect(setSettings).toHaveBeenCalledWith({ count: 3 });
            expect(setTitle).toHaveBeenCalledWith("3");
        });

        it("count が 9 のとき、短押しで count を 27 にセットする", async () => {
            vi.useFakeTimers();
            const { action, setSettings, setTitle } = makeSharedAction();
            const evDown = makeKeyDownEvent(action, { count: 9 });
            const evUp = makeKeyUpEvent(action, { count: 9 });

            counter.onKeyDown(evDown as never);
            await vi.advanceTimersByTimeAsync(100);
            await counter.onKeyUp(evUp as never);

            expect(setSettings).toHaveBeenCalledWith({ count: 27 });
            expect(setTitle).toHaveBeenCalledWith("27");
        });
    });

    describe("長押しリセット", () => {
        it("onKeyDown 後 500ms 経過したとき、count が 1 にリセットされる", async () => {
            vi.useFakeTimers();
            const { action, setSettings, setTitle } = makeSharedAction();
            const evDown = makeKeyDownEvent(action, { count: 9 });

            counter.onKeyDown(evDown as never);
            await vi.advanceTimersByTimeAsync(500);

            expect(setSettings).toHaveBeenCalledWith({ count: 1 });
            expect(setTitle).toHaveBeenCalledWith("1");
        });

        it("onKeyDown 後 500ms 以内に onKeyUp が来たとき、count はリセットされない", async () => {
            vi.useFakeTimers();
            const { action, setSettings } = makeSharedAction();
            const evDown = makeKeyDownEvent(action, { count: 9 });
            const evUp = makeKeyUpEvent(action, { count: 9 });

            counter.onKeyDown(evDown as never);
            await vi.advanceTimersByTimeAsync(499);
            await counter.onKeyUp(evUp as never);

            expect(setSettings).not.toHaveBeenCalledWith({ count: 1 });
        });

        it("長押しタイマー発火後に onKeyUp が来ても count は増加しない", async () => {
            vi.useFakeTimers();
            const { action, setSettings } = makeSharedAction();
            const evDown = makeKeyDownEvent(action, { count: 3 });
            const evUp = makeKeyUpEvent(action, { count: 3 });

            counter.onKeyDown(evDown as never);
            await vi.advanceTimersByTimeAsync(500); // 長押し発火
            await counter.onKeyUp(evUp as never); // その後 keyUp

            // count=9 にはなっていないこと
            expect(setSettings).not.toHaveBeenCalledWith({ count: 9 });
        });

        it("リセット後 onWillAppear で count=1 が表示される", async () => {
            const { action, setTitle } = makeSharedAction();
            const ev = { action, payload: { settings: { count: 1 } } };

            await counter.onWillAppear(ev as never);

            expect(setTitle).toHaveBeenCalledWith("1");
        });
    });
});
