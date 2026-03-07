import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ERROR_IMAGE_DISPLAY_MS = 3000;

// モジュールロード時に一度だけ読み込む（ESM では __dirname が使えないため import.meta.url で解決）
const errorImageDataUri = (() => {
    const dir = dirname(fileURLToPath(import.meta.url));
    const imgPath = join(dir, "../imgs/actions/common/error.png");
    const base64 = readFileSync(imgPath).toString("base64");
    return `data:image/png;base64,${base64}`;
})();

/**
 * 画像を設定できるアクションのインターフェース
 */
export interface ImageSettable {
    setImage(image?: string): Promise<void>;
    showAlert?(): Promise<void>;
}

/**
 * エラー画像を表示したときに、アラートを表示する。
 */
async function showFallbackAlert(action: ImageSettable): Promise<void> {
    if (!action.showAlert) return;
    try {
        await action.showAlert();
    } catch {
        process.emitWarning("Failed to show alert while handling error image.");
    }
}

/**
 * エラー画像をボタンに表示し、3 秒後に元の画像に戻す。
 * すべてのアクションから共通で使用できる。
 */
export async function showErrorImage(action: ImageSettable): Promise<void> {
    try {
        await action.setImage(errorImageDataUri);
    } catch {
        await showFallbackAlert(action);
        return;
    }

    setTimeout(() => {
        void action.setImage().catch(() => {
            // コンテキスト破棄後の setImage 失敗で未処理 rejection を出さない。
        });
    }, ERROR_IMAGE_DISPLAY_MS);
}
