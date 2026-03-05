import streamDeck from "@elgato/streamdeck";

export type GlobalSettings = {
    kingOfTimeUrl?: string;
    tokenKey?: string;
    token?: string;
};

export function hasRequiredSettings(s: GlobalSettings): boolean {
    return Boolean(s.kingOfTimeUrl && s.tokenKey && s.token);
}

export async function getGlobalSettings(): Promise<GlobalSettings> {
    return streamDeck.settings.getGlobalSettings<GlobalSettings>();
}
