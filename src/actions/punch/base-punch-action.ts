import type { KeyDownEvent, KeyUpEvent } from "@elgato/streamdeck";
import { SingletonAction } from "@elgato/streamdeck";
import {
    getGlobalSettings,
    hasRequiredPunchSettings,
} from "../../platform/streamdeck/settings/punch-settings";
import { punchKot, type PunchSelector } from "../../services/kot/punch";
import { showErrorImage } from "../../platform/streamdeck/show-error-image";
import { notify } from "../../platform/desktop/notify";
import { createPressTracker } from "../../shared/long-press";
import type { LoggerScope } from "../../platform/streamdeck/logger";

// 打刻 action の共通処理をまとめる。
export abstract class BasePunchAction extends SingletonAction {
    // action ごとのログを使い分ける。
    protected abstract readonly logger: LoggerScope;
    // 押す打刻ボタンを切り替える。
    protected abstract readonly selector: PunchSelector;
    // 成功時の通知文言を切り替える。
    protected abstract readonly successMessage: string;

    // 二重実行を防ぐ。
    private _isProcessing = false;
    // 長押し判定を共有する。
    private readonly pressTracker = createPressTracker();

    // key down では長押しだけ監視する。
    override onKeyDown(ev: KeyDownEvent): void {
        if (this._isProcessing) {
            this.logger.debug("already processing on key down, skipped");
            return;
        }

        // 長押し時だけ state を反転する。
        const nextState = ev.payload.state === 1 ? 0 : 1;
        this.pressTracker.begin(ev.action.id, () => {
            this.logger.debug(`manual state update via long press: ${ev.payload.state} -> ${nextState}`);
            void ev.action.setState(nextState).catch((error: unknown) => {
                this.logger.error(
                    `manual state update failed: ${error instanceof Error ? error.message : String(error)}`,
                );
            });
        });
    }

    // key up では短押し時だけ打刻する。
    override async onKeyUp(ev: KeyUpEvent): Promise<void> {
        this.logger.info("onKeyUp triggered");

        // 処理中なら何もしない。
        if (this._isProcessing) {
            this.logger.debug("already processing, skipped");
            this.pressTracker.clear(ev.action.id);
            return;
        }

        // 長押し後の key up は無視する。
        if (this.pressTracker.end(ev.action.id)) {
            const nextState = ev.payload.state === 1 ? 0 : 1;
            this.logger.debug(`key up skipped after long press: ${ev.payload.state} -> ${nextState}`);
            return;
        }

        // 打刻済み state の短押しは無視する。
        if (ev.payload.state === 1) {
            this.logger.debug("short press on state 1 skipped");
            return;
        }

        // ここから実際の打刻処理に入る。
        this._isProcessing = true;

        try {
            // グローバル設定を読む。
            this.logger.debug("fetching settings");
            const settings = await getGlobalSettings();

            // 必須設定が足りなければ警告を出す。
            if (!hasRequiredPunchSettings(settings)) {
                this.logger.warn("required settings missing");
                void notify("全項目必須です。設定を確認してください。");
                await ev.action.showAlert();
                return;
            }

            // 打刻して state を成功側に寄せる。
            this.logger.info("starting punch");
            await punchKot(this.selector, settings);
            this.logger.info("punch succeeded");
            await ev.action.showOk();
            await ev.action.setState(1);
            void notify(this.successMessage);
        } catch (error) {
            // 失敗時はエラー画像を出して state を戻す。
            this.logger.error(`punch failed: ${error instanceof Error ? error.message : String(error)}`);
            void showErrorImage(ev.action);
            await ev.action.setState(0);
        } finally {
            // 終了後は処理中フラグを戻す。
            this._isProcessing = false;
        }
    }
}
