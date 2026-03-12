import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// エラー画像を出す秒数。
const ERROR_IMAGE_DISPLAY_MS = 3000;

// 実行場所に応じて画像パスを決める。
export function resolveErrorImagePath(moduleUrl: string | URL = import.meta.url): string {
    const dir = dirname(fileURLToPath(moduleUrl));
    const candidates = [
        join(dir, "../imgs/actions/common/error.png"),
        join(dir, "../../../com.hrk-m.kot-punch.sdPlugin/imgs/actions/common/error.png"),
    ];

    return candidates.find((path) => existsSync(path)) ?? candidates[0];
}

// エラー画像は起動時に一度だけ読む。
const errorImageDataUri = (() => {
    const imgPath = resolveErrorImagePath();
    const base64 = readFileSync(imgPath).toString("base64");
    return `data:image/png;base64,${base64}`;
})();

// 画像を差し替えられる action の最小形。
export interface ImageSettable {
    setImage(image?: string): Promise<void>;
    showAlert?(): Promise<void>;
}

// 画像を出せないときは alert に切り替える。
async function showFallbackAlert(action: ImageSettable): Promise<void> {
    if (!action.showAlert) {
        return;
    }

    try {
        await action.showAlert();
    } catch {
        process.emitWarning("Failed to show alert while handling error image.");
    }
}

// 一時的にエラー画像を表示する。
export async function showErrorImage(action: ImageSettable): Promise<void> {
    try {
        await action.setImage(errorImageDataUri);
    } catch {
        await showFallbackAlert(action);
        return;
    }

    // 一定時間後に元の画像へ戻す。
    setTimeout(() => {
        void action.setImage().catch(() => {
            // Ignore teardown races after the Stream Deck context has gone away.
        });
    }, ERROR_IMAGE_DISPLAY_MS);
}
