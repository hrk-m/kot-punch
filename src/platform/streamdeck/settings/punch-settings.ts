import streamDeck from "@elgato/streamdeck";

// 打刻と KOT 画面用の設定。
export type KotPunchSettings = {
    kotPunchUrl?: string;
    kotPunchKey?: string;
    kotPunchToken?: string;
    kotPunchUsername?: string;
    kotPunchPassword?: string;
};

// 打刻 action の必須設定を確認する。
export function hasRequiredPunchSettings(settings: KotPunchSettings): boolean {
    return Boolean(hasRequiredSettings(settings) && settings.kotPunchUsername && settings.kotPunchPassword);
}

// KOT 画面を開く最低限の設定を確認する。
export function hasRequiredSettings(settings: KotPunchSettings): boolean {
    return Boolean(settings.kotPunchUrl && settings.kotPunchKey && settings.kotPunchToken);
}

// Stream Deck のグローバル設定を読む。
export function getGlobalSettings(): Promise<KotPunchSettings> {
    return streamDeck.settings.getGlobalSettings<KotPunchSettings>();
}
