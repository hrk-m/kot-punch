// 長押し判定の閾値。
export const LONG_PRESS_THRESHOLD_MS = 2000;

// action ごとの長押し状態を扱う。
export type PressTracker = {
    begin(context: string, onLongPress: () => Promise<void> | void): void;
    end(context: string): boolean;
    clear(context: string): void;
    hasTriggered(context: string): boolean;
};

// 長押し状態を管理する。
export function createPressTracker(): PressTracker {
    // context ごとにタイマーを持つ。
    const states = new Map<
        string,
        {
            timer?: ReturnType<typeof setTimeout>;
            triggered: boolean;
        }
    >();

    // 指定 context のタイマーを消す。
    const clearContext = (context: string): void => {
        const state = states.get(context);
        if (state?.timer !== undefined) {
            clearTimeout(state.timer);
        }
        states.delete(context);
    };

    return {
        begin(context: string, onLongPress: () => Promise<void> | void): void {
            // 再押下時は前の状態を消す。
            clearContext(context);

            // 閾値到達で callback を一度だけ呼ぶ。
            const state = {
                triggered: false,
                timer: setTimeout(() => {
                    const current = states.get(context);
                    if (current === undefined || current.triggered) {
                        return;
                    }

                    current.triggered = true;
                    current.timer = undefined;
                    void onLongPress();
                }, LONG_PRESS_THRESHOLD_MS),
            };

            states.set(context, state);
        },
        end(context: string): boolean {
            // key up 時に成立済みかだけ返す。
            const wasTriggered = states.get(context)?.triggered === true;
            clearContext(context);
            return wasTriggered;
        },
        clear(context: string): void {
            // 外部から明示的に破棄する。
            clearContext(context);
        },
        hasTriggered(context: string): boolean {
            // テスト用に内部状態を覗く。
            return states.get(context)?.triggered === true;
        },
    };
}
