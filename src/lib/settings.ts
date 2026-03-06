import streamDeck from "@elgato/streamdeck";

// グローバル設定の型
export type GlobalSettings = {
    kingOfTimeUrl?: string;
    tokenKey?: string;
    token?: string;
    username?: string;
    password?: string;
    dryRun?: boolean;
};

// clock-in 用の必須項目
export function hasRequiredPunchSettings(s: GlobalSettings): boolean {
    return Boolean(hasRequiredSettings(s) && s.username && s.password);
}

// open-kot 用の必須項目
export function hasRequiredSettings(s: GlobalSettings): boolean {
    return Boolean(s.kingOfTimeUrl && s.tokenKey && s.token);
}

// グローバル設定を取得
export async function getGlobalSettings(): Promise<GlobalSettings> {
    return streamDeck.settings.getGlobalSettings<GlobalSettings>();
}
