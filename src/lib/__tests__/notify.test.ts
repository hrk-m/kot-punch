import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockNotifierNotify } = vi.hoisted(() => ({ mockNotifierNotify: vi.fn() }));
vi.mock("node-notifier", () => ({
    default: { notify: mockNotifierNotify },
}));

import { notify } from "../notify";

describe("notify", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("title='KOT Punch' と指定メッセージを node-notifier に渡す", () => {
        notify("出勤打刻が完了しました");
        expect(mockNotifierNotify).toHaveBeenCalledWith(
            { title: "KOT Punch", message: "出勤打刻が完了しました", sender: "com.elgato.StreamDeck" },
            expect.any(Function)
        );
    });

    it("異なるメッセージを渡すと正しく転送する", () => {
        notify("申請画面を開きました");
        expect(mockNotifierNotify).toHaveBeenCalledWith(
            { title: "KOT Punch", message: "申請画面を開きました", sender: "com.elgato.StreamDeck" },
            expect.any(Function)
        );
    });

    it("notify callback が error を返しても呼び出し元に伝播せず warning を残す", () => {
        const emitWarning = vi.spyOn(process, "emitWarning").mockImplementation(() => {});
        mockNotifierNotify.mockImplementation((_: unknown, callback?: (error?: Error | null) => void) => {
            callback?.(new Error("notification callback failed"));
        });

        expect(() => notify("テスト")).not.toThrow();
        expect(emitWarning).toHaveBeenCalledWith(
            "Failed to send desktop notification: notification callback failed"
        );
    });

    it("notifier.notify が同期例外を投げても呼び出し元に伝播せず warning を残す", () => {
        const emitWarning = vi.spyOn(process, "emitWarning").mockImplementation(() => {});
        mockNotifierNotify.mockImplementation(() => {
            throw new Error("notification failed");
        });

        expect(() => notify("テスト")).not.toThrow();
        expect(emitWarning).toHaveBeenCalledWith(
            "Failed to send desktop notification: notification failed"
        );
    });
});
