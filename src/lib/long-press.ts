export const LONG_PRESS_THRESHOLD_MS = 2000;

export type PressTracker = {
    begin(context: string, onLongPress: () => Promise<void> | void): void;
    end(context: string): boolean;
    clear(context: string): void;
    hasTriggered(context: string): boolean;
};

// 長押し判定ロジックを共通化する
export function createPressTracker(): PressTracker {
    // action ごとにタイマーと成立状態を持つ。
    const states = new Map<
        string,
        {
            timer?: ReturnType<typeof setTimeout>;
            triggered: boolean;
        }
    >();

    // 既存タイマーを止めて状態を破棄する。
    const clearContext = (context: string): void => {
        const state = states.get(context);
        if (state?.timer !== undefined) {
            clearTimeout(state.timer);
        }
        states.delete(context);
    };

    return {
        begin(context: string, onLongPress: () => Promise<void> | void): void {
            clearContext(context);

            // 新しい押下を記録し、閾値到達で callback を一度だけ流す。
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
            // key up 時に長押し成立済みかだけ返す。
            const wasTriggered = states.get(context)?.triggered === true;
            clearContext(context);
            return wasTriggered;
        },
        clear(context: string): void {
            clearContext(context);
        },
        hasTriggered(context: string): boolean {
            // テストから内部状態を確認する。
            return states.get(context)?.triggered === true;
        },
    };
}
