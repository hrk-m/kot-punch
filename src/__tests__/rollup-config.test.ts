import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveKotPunchDebugValue } from "../../rollup.config.mjs";

const tempDirs: string[] = [];
const originalDebugValue = process.env.KOT_PUNCH_DEBUG;

async function makeTempRoot(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), "kot-punch-rollup-config-"));
    tempDirs.push(dir);
    return dir;
}

afterEach(async () => {
    if (originalDebugValue === undefined) {
        delete process.env.KOT_PUNCH_DEBUG;
    } else {
        process.env.KOT_PUNCH_DEBUG = originalDebugValue;
    }

    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { force: true, recursive: true })));
});

describe("rollup config", () => {
    it(".env に KOT_PUNCH_DEBUG=true があると build-time の置換値も true になる", async () => {
        const rootDir = await makeTempRoot();
        await writeFile(join(rootDir, ".env"), "KOT_PUNCH_DEBUG=true\n", "utf8");
        delete process.env.KOT_PUNCH_DEBUG;

        expect(resolveKotPunchDebugValue(rootDir)).toBe("true");
    });

    it(".env がなく process.env にもないときは false を既定値にする", async () => {
        const rootDir = await makeTempRoot();
        delete process.env.KOT_PUNCH_DEBUG;

        expect(resolveKotPunchDebugValue(rootDir)).toBe("false");
    });
});
