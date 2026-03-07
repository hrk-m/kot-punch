import streamDeck from "@elgato/streamdeck";

// KotPunch(勤怠画面)用の設定
export type KotPunchSettings = {
    kotPunchUrl?: string;
    kotPunchKey?: string;
    kotPunchToken?: string;
    kotPunchUsername?: string;
    kotPunchPassword?: string;
    kotPunchDryRun?: boolean;
};

// 申請画面用の設定
export type RequestSettings = {
    requestUrl?: string;
    requestUsername?: string;
    requestPassword?: string;
};

// clock-in 用の必須項目
export function hasRequiredPunchSettings(s: KotPunchSettings): boolean {
    return Boolean(hasRequiredSettings(s) && s.kotPunchUsername && s.kotPunchPassword);
}

// open-kot 用の必須項目
export function hasRequiredSettings(s: KotPunchSettings): boolean {
    return Boolean(s.kotPunchUrl && s.kotPunchKey && s.kotPunchToken);
}

// グローバル設定を取得
export async function getGlobalSettings(): Promise<KotPunchSettings> {
    return streamDeck.settings.getGlobalSettings<KotPunchSettings>();
}

// open-request 用の必須項目
export function hasRequiredRequestSettings(s: RequestSettings): boolean {
    return Boolean(s.requestUrl && s.requestUsername && s.requestPassword);
}

// 申請画面用のグローバル設定を取得
export async function getRequestSettings(): Promise<RequestSettings> {
    return streamDeck.settings.getGlobalSettings<RequestSettings>();
}
