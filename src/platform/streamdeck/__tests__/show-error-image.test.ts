import { afterEach, describe, expect, it, vi } from "vitest";
import { join } from "node:path";

const mockReadFileSync = vi.fn(() => Buffer.from("test-image"));

vi.mock("fs", async () => {
    const actual = await vi.importActual("fs");
    return {
        ...actual,
        readFileSync: mockReadFileSync,
    };
});

const showErrorImageModule = await import("../show-error-image");
const { showErrorImage, resolveErrorImagePath } = showErrorImageModule;

describe("showErrorImage", () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("最初の setImage が失敗したら showAlert へフォールバックする", async () => {
        const setImage = vi.fn().mockRejectedValueOnce(new Error("context is gone"));
        const showAlert = vi.fn().mockResolvedValue(undefined);
        const action = { setImage, showAlert };

        await expect(showErrorImage(action)).resolves.toBeUndefined();
        expect(setImage).toHaveBeenCalledWith(expect.stringMatching(/^data:image\/png;base64,/));
        expect(showAlert).toHaveBeenCalledOnce();
    });

    it("showAlert が失敗したら warning を残す", async () => {
        const setImage = vi.fn().mockRejectedValueOnce(new Error("context is gone"));
        const showAlert = vi.fn().mockRejectedValueOnce(new Error("alert unavailable"));
        const emitWarning = vi.spyOn(process, "emitWarning").mockImplementation(() => {});
        const action = { setImage, showAlert };

        await expect(showErrorImage(action)).resolves.toBeUndefined();
        expect(showAlert).toHaveBeenCalledOnce();
        expect(emitWarning).toHaveBeenCalledWith("Failed to show alert while handling error image.");
    });

    it("タイマー内の setImage 失敗は未処理 rejection にしない", async () => {
        vi.useFakeTimers();
        const setImage = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("key removed"));
        const showAlert = vi.fn().mockResolvedValue(undefined);
        const action = { setImage, showAlert };

        await expect(showErrorImage(action)).resolves.toBeUndefined();
        await vi.advanceTimersByTimeAsync(3000);

        expect(setImage).toHaveBeenNthCalledWith(1, expect.stringMatching(/^data:image\/png;base64,/));
        expect(setImage).toHaveBeenCalledTimes(2);
        expect(setImage.mock.calls[1]).toEqual([]);
        expect(showAlert).not.toHaveBeenCalled();
    });

    it("bundle 実行時は plugin package 配下の error.png を参照する", () => {
        const bundledModuleUrl = new URL(
            "../../../../com.hrk-m.kot-punch.sdPlugin/bin/plugin.js",
            import.meta.url,
        );

        expect(resolveErrorImagePath(bundledModuleUrl)).toBe(
            join(process.cwd(), "com.hrk-m.kot-punch.sdPlugin/imgs/actions/common/error.png"),
        );
    });
});
