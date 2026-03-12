import streamDeck from "@elgato/streamdeck";

// 申請画面用の設定。
export type RequestSettings = {
    requestUrl?: string;
    requestUsername?: string;
    requestPassword?: string;
};

// 申請画面を開く必須設定を確認する。
export function hasRequiredRequestSettings(settings: RequestSettings): boolean {
    return Boolean(settings.requestUrl && settings.requestUsername && settings.requestPassword);
}

// Stream Deck のグローバル設定を読む。
export async function getRequestSettings(): Promise<RequestSettings> {
    return streamDeck.settings.getGlobalSettings<RequestSettings>();
}
