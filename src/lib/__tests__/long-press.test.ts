import { describe, expect, it } from "vitest";
import { createPressTracker, isLongPress, LONG_PRESS_THRESHOLD_MS } from "../long-press.js";

describe("createPressTracker", () => {
    it("begin() 後に end() すると経過時間を返す", () => {
        const tracker = createPressTracker();

        tracker.begin("clock-in", 1000);

        expect(tracker.end("clock-in", 3000)).toBe(2000);
    });

    it("begin() されていない context の end() は undefined を返す", () => {
        const tracker = createPressTracker();

        expect(tracker.end("missing", 4000)).toBeUndefined();
    });

    it("clear() 後は以前の押下状態を再利用しない", () => {
        const tracker = createPressTracker();

        tracker.begin("clock-out", 1000);
        tracker.clear("clock-out");

        expect(tracker.end("clock-out", 4000)).toBeUndefined();
    });
});

describe("isLongPress", () => {
    it("長押し閾値は 2000ms 固定", () => {
        expect(LONG_PRESS_THRESHOLD_MS).toBe(2000);
    });

    it("2000ms ちょうどで true を返す", () => {
        expect(isLongPress(2000)).toBe(true);
    });

    it("1999ms では false を返す", () => {
        expect(isLongPress(1999)).toBe(false);
    });
});
