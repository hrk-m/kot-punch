import { describe, it, expect, vi, beforeEach } from "vitest";

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
    }

    return { action, SingletonAction };
});

// モック後に対象モジュールをインポート
const { IncrementCounter } = await import("../increment-counter.js");

// ev.action のスタブヘルパー
function makeEvent(settings: Record<string, unknown>) {
    const setTitle = vi.fn().mockResolvedValue(undefined);
    const setSettings = vi.fn().mockResolvedValue(undefined);

    const ev = {
        action: { setTitle, setSettings },
        payload: { settings: { ...settings } },
    };

    return { ev, setTitle, setSettings };
}

describe("IncrementCounter", () => {
    let counter: InstanceType<typeof IncrementCounter>;

    beforeEach(() => {
        counter = new IncrementCounter();
    });

    describe("onWillAppear", () => {
        it("count が未設定のとき、タイトルを '0' に設定する", async () => {
            const { ev, setTitle } = makeEvent({});

            await counter.onWillAppear(ev as never);

            expect(setTitle).toHaveBeenCalledOnce();
            expect(setTitle).toHaveBeenCalledWith("0");
        });

        it("count が設定済みのとき、その値をタイトルに設定する", async () => {
            const { ev, setTitle } = makeEvent({ count: 5 });

            await counter.onWillAppear(ev as never);

            expect(setTitle).toHaveBeenCalledWith("5");
        });
    });

    describe("onKeyDown", () => {
        it("incrementBy が未設定のとき、count を 1 増加させる", async () => {
            const { ev, setSettings, setTitle } = makeEvent({ count: 0 });

            await counter.onKeyDown(ev as never);

            expect(setSettings).toHaveBeenCalledWith(
                expect.objectContaining({ count: 1, incrementBy: 1 }),
            );
            expect(setTitle).toHaveBeenCalledWith("1");
        });

        it("incrementBy が 3 のとき、count を 3 増加させる", async () => {
            const { ev, setSettings, setTitle } = makeEvent({
                count: 10,
                incrementBy: 3,
            });

            await counter.onKeyDown(ev as never);

            expect(setSettings).toHaveBeenCalledWith(
                expect.objectContaining({ count: 13, incrementBy: 3 }),
            );
            expect(setTitle).toHaveBeenCalledWith("13");
        });

        it("count が未設定のとき、0 から開始して増加させる", async () => {
            const { ev, setTitle } = makeEvent({});

            await counter.onKeyDown(ev as never);

            expect(setTitle).toHaveBeenCalledWith("1");
        });
    });
});
