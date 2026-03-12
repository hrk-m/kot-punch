import { access } from "node:fs/promises";
import { readdir, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { describe, expect, it } from "vitest";

async function pathExists(path: string): Promise<boolean> {
    try {
        await access(new URL(path, import.meta.url), constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

async function collectTypeScriptFiles(directory: URL): Promise<URL[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = await Promise.all(
        entries.map(async (entry) => {
            const path = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);

            if (entry.isDirectory()) {
                return collectTypeScriptFiles(path);
            }

            return entry.name.endsWith(".ts") ? [path] : [];
        }),
    );

    return files.flat();
}

async function findRelativeJsSpecifiers(): Promise<string[]> {
    const files = await collectTypeScriptFiles(new URL("../", import.meta.url));
    const specifierPattern = /(?:from\s+|import\s*\(|vi\.mock\()\s*["'](\.\.?\/[^"']+)\.js["']/g;
    const fileMatches = await Promise.all(
        files.map(async (file) => {
            const content = await readFile(file, "utf8");
            return Array.from(content.matchAll(specifierPattern), (match) => `${file.pathname}: ${match[1]}.js`);
        }),
    );

    return fileMatches.flat();
}

describe("src architecture", () => {
    it("uses actions/services/platform/shared instead of src/lib", async () => {
        const expectedPaths = [
            "../actions/punch/base-punch-action.ts",
            "../services/kot/auth.ts",
            "../services/kot/open-kot.ts",
            "../services/kot/open-request.ts",
            "../services/kot/punch.ts",
            "../platform/desktop/notify.ts",
            "../platform/streamdeck/logger.ts",
            "../platform/streamdeck/settings/punch-settings.ts",
            "../platform/streamdeck/settings/request-settings.ts",
            "../platform/streamdeck/show-error-image.ts",
            "../shared/long-press.ts",
        ];

        const legacyPaths = [
            "../lib/long-press.ts",
            "../lib/settings.ts",
            "../lib/puppeteer.ts",
            "../lib/notify.ts",
            "../lib/logger.ts",
            "../lib/showErrorImage.ts",
        ];

        await expect(Promise.all(expectedPaths.map((path) => pathExists(path)))).resolves.toEqual(
            Array(expectedPaths.length).fill(true),
        );
        await expect(Promise.all(legacyPaths.map((path) => pathExists(path)))).resolves.toEqual(
            Array(legacyPaths.length).fill(false),
        );
    });

    it("omits .js extensions from relative imports in TypeScript sources", async () => {
        await expect(findRelativeJsSpecifiers()).resolves.toEqual([]);
    });
});
