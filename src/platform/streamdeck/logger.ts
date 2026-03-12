import streamDeck from "@elgato/streamdeck";

// action から使う最小のロガー型。
export type LoggerScope = {
    debug(...data: unknown[]): void;
    info(...data: unknown[]): void;
    warn(...data: unknown[]): void;
    error(...data: unknown[]): void;
};

// テスト時は空実装に落とす。
const noop: LoggerScope = {
    debug: (_msg: string) => {},
    info: (_msg: string) => {},
    warn: (_msg: string) => {},
    error: (_msg: string) => {},
};

// Stream Deck の scoped logger を取る。
function createScope(name: string): LoggerScope {
    try {
        return streamDeck.logger.createScope(name);
    } catch {
        return noop;
    }
}

// 使うスコープをまとめて公開する。
export const logger = {
    clockIn: createScope("clock-in"),
    clockOut: createScope("clock-out"),
    openKot: createScope("open-kot"),
    openRequest: createScope("open-request"),
    puppeteer: createScope("puppeteer"),
    notify: createScope("notify"),
};
