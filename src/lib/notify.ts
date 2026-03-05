import { execFile } from "child_process";
import { showErrorImage } from "./showErrorImage.js";
import type { ImageSettable } from "./showErrorImage.js";

/**
 * macOS の通知センターにエラー通知を表示する。
 * action を渡した場合はボタン画像もエラー表示に切り替え、3 秒後に元に戻す。
 * fire-and-forget（結果は待たない）。
 */
export function notifyError(title: string, message: string, action?: ImageSettable): void {
    const script = `display notification ${JSON.stringify(message)} with title ${JSON.stringify(title)}`;
    execFile("osascript", ["-e", script]);
    if (action) {
        showErrorImage(action);
    }
}
