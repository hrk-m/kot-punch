import streamDeck from "@elgato/streamdeck";

type Scope = ReturnType<typeof streamDeck.logger.createScope>;

const noop = {
    debug: (_msg: string) => {},
    info: (_msg: string) => {},
    warn: (_msg: string) => {},
    error: (_msg: string) => {},
} as unknown as Scope;

/**
 * 指定したスコープ名のロガーを生成する。
 * ログは Stream Deck のログファイル（logs/com.hrk-m.kot-punch.0.log）に出力される。
 *
 * @example
 * const logger = createLogger("notify");
 * logger.debug("message"); // → "DEBUG notify: message"
 */
function createScope(name: string): Scope {
    try {
        return streamDeck.logger.createScope(name);
    } catch {
        return noop;
    }
}

// ロガーを定義する
export const logger = {
    clockIn: createScope("clock-in"),
    clockOut: createScope("clock-out"),
    openKot: createScope("open-kot"),
    openRequest: createScope("open-request"),
    puppeteer: createScope("puppeteer"),
    notify: createScope("notify"),
};
