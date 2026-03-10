export const LONG_PRESS_THRESHOLD_MS = 2000;

export type PressTracker = {
    begin(context: string, now?: number): void;
    end(context: string, now?: number): number | undefined;
    clear(context: string): void;
};

export function createPressTracker(): PressTracker {
    const startedAt = new Map<string, number>();

    return {
        begin(context: string, now = Date.now()): void {
            startedAt.set(context, now);
        },
        end(context: string, now = Date.now()): number | undefined {
            const start = startedAt.get(context);
            startedAt.delete(context);
            return start === undefined ? undefined : now - start;
        },
        clear(context: string): void {
            startedAt.delete(context);
        },
    };
}

export function isLongPress(durationMs: number, thresholdMs = LONG_PRESS_THRESHOLD_MS): boolean {
    return durationMs >= thresholdMs;
}
