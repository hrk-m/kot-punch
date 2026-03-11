import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPressTracker, LONG_PRESS_THRESHOLD_MS } from "../long-press.js";

describe("createPressTracker", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("2000ms 到達時に callback を一度だけ呼ぶ", async () => {
        const tracker = createPressTracker();
        const onLongPress = vi.fn();

        tracker.begin("clock-in", onLongPress);

        await vi.advanceTimersByTimeAsync(1999);
        expect(onLongPress).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1);
        expect(onLongPress).toHaveBeenCalledOnce();
        expect(tracker.hasTriggered("clock-in")).toBe(true);
    });

    it("begin() されていない context の end() は false を返す", () => {
        const tracker = createPressTracker();

        expect(tracker.end("missing")).toBe(false);
    });

    it("clear() 後は callback が発火しない", async () => {
        const tracker = createPressTracker();
        const onLongPress = vi.fn();

        tracker.begin("clock-out", onLongPress);
        tracker.clear("clock-out");

        await vi.advanceTimersByTimeAsync(2000);

        expect(onLongPress).not.toHaveBeenCalled();
        expect(tracker.end("clock-out")).toBe(false);
    });

    it("長押し成立後の end() は true を返して後始末する", async () => {
        const tracker = createPressTracker();

        tracker.begin("clock-out", vi.fn());
        await vi.advanceTimersByTimeAsync(2000);

        expect(tracker.end("clock-out")).toBe(true);
        expect(tracker.hasTriggered("clock-out")).toBe(false);
    });
});

describe("LONG_PRESS_THRESHOLD_MS", () => {
    it("長押し閾値は 2000ms 固定", () => {
        expect(LONG_PRESS_THRESHOLD_MS).toBe(2000);
    });
});
