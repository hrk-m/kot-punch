import { describe, it, expect, vi, beforeEach } from "vitest";

// hoisted で mock action 一覧を管理する。
const { getMockActions, setMockActions } = vi.hoisted(() => {
    type MockAction = {
        manifestId: string;
        isKey: () => boolean;
        setState: ReturnType<typeof vi.fn>;
    };
    let items: MockAction[] = [];
    return {
        getMockActions: () => items,
        setMockActions: (next: MockAction[]) => {
            items = next;
        },
    };
});

vi.mock("@elgato/streamdeck", () => {
    const action =
        (_definition: { UUID: string }) =>
        <T>(target: T, _context: ClassDecoratorContext): T =>
            target;

    class SingletonAction<_TSettings = unknown> {
        onKeyUp(_ev: unknown): void | Promise<void> {}
    }

    const mockStreamDeck = {
        actions: {
            [Symbol.iterator]: () => getMockActions()[Symbol.iterator](),
        },
    };

    return { action, SingletonAction, default: mockStreamDeck };
});

const mockNotify = vi.fn();
vi.mock("../../platform/desktop/notify", () => ({
    notify: mockNotify,
}));

const { ResetPunchState } = await import("../reset-punch-state");

// モックアクション生成ヘルパー。
function makeAction(manifestId: string, setState = vi.fn().mockResolvedValue(undefined)) {
    return { manifestId, isKey: () => true, setState };
}

function makeKeyUpEvent() {
    return {};
}

describe("ResetPunchState", () => {
    let resetPunchState: InstanceType<typeof ResetPunchState>;

    beforeEach(() => {
        resetPunchState = new ResetPunchState();
        vi.clearAllMocks();
        setMockActions([]);
    });

    describe("onKeyUp - 正常系", () => {
        it("clock-in / clock-out の全インスタンスに setState(0) が呼ばれる", async () => {
            const clockIn = makeAction("com.hrk-m.kot-punch.clock-in");
            const clockOut = makeAction("com.hrk-m.kot-punch.clock-out");
            const openKot = makeAction("com.hrk-m.kot-punch.open-kot");
            setMockActions([clockIn, clockOut, openKot]);

            await resetPunchState.onKeyUp(makeKeyUpEvent() as never);

            expect(clockIn.setState).toHaveBeenCalledOnce();
            expect(clockIn.setState).toHaveBeenCalledWith(0);
            expect(clockOut.setState).toHaveBeenCalledOnce();
            expect(clockOut.setState).toHaveBeenCalledWith(0);
        });

        it("notify が正しいメッセージで呼ばれる", async () => {
            const clockIn = makeAction("com.hrk-m.kot-punch.clock-in");
            setMockActions([clockIn]);

            await resetPunchState.onKeyUp(makeKeyUpEvent() as never);

            expect(mockNotify).toHaveBeenCalledWith("打刻状態(出勤/退勤)をリセットしました");
        });

        it("対象外アクション（open-kot / open-request）の setState は呼ばれない", async () => {
            const openKot = makeAction("com.hrk-m.kot-punch.open-kot");
            const openRequest = makeAction("com.hrk-m.kot-punch.open-request");
            setMockActions([openKot, openRequest]);

            await resetPunchState.onKeyUp(makeKeyUpEvent() as never);

            expect(openKot.setState).not.toHaveBeenCalled();
            expect(openRequest.setState).not.toHaveBeenCalled();
        });

        it("対象外アクションのみ存在する場合でも notify は呼ばれる", async () => {
            const openKot = makeAction("com.hrk-m.kot-punch.open-kot");
            setMockActions([openKot]);

            await resetPunchState.onKeyUp(makeKeyUpEvent() as never);

            expect(mockNotify).toHaveBeenCalledWith("打刻状態(出勤/退勤)をリセットしました");
        });
    });

    describe("onKeyUp - setState 失敗時の継続", () => {
        it("clock-in の setState が throw しても clock-out と notify は実行される", async () => {
            const clockIn = makeAction("com.hrk-m.kot-punch.clock-in", vi.fn().mockRejectedValue(new Error("setState failed")));
            const clockOut = makeAction("com.hrk-m.kot-punch.clock-out");
            setMockActions([clockIn, clockOut]);

            await resetPunchState.onKeyUp(makeKeyUpEvent() as never);

            expect(clockIn.setState).toHaveBeenCalledWith(0);
            expect(clockOut.setState).toHaveBeenCalledWith(0);
            expect(mockNotify).toHaveBeenCalledWith("打刻状態(出勤/退勤)をリセットしました");
        });
    });
});
