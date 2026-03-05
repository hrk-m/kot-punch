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

export interface ImageSettable {
    setImage(image?: string): Promise<void>;
}

/**
 * エラー画像をボタンに表示し、3 秒後に元の画像に戻す。
 * すべてのアクションから共通で使用できる。
 */
export async function showErrorImage(action: ImageSettable): Promise<void> {
    await action.setImage(errorImageDataUri);
    setTimeout(async () => {
        await action.setImage();
    }, ERROR_IMAGE_DISPLAY_MS);
}
