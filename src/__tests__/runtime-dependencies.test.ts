import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

type PackageJson = {
    dependencies?: Record<string, string>;
    scripts?: Record<string, string>;
};

async function readPackageJson(path: URL): Promise<PackageJson> {
    return JSON.parse(await readFile(path, "utf8")) as PackageJson;
}

describe("runtime dependency versions", () => {
    it("root と plugin package.json の puppeteer version を exact match で固定する", async () => {
        const rootPackage = await readPackageJson(new URL("../../package.json", import.meta.url));
        const pluginPackage = await readPackageJson(
            new URL("../../com.hrk-m.kot-punch.sdPlugin/package.json", import.meta.url),
        );

        const rootPuppeteer = rootPackage.dependencies?.puppeteer;
        const pluginPuppeteer = pluginPackage.dependencies?.puppeteer;

        expect(rootPuppeteer).toBeDefined();
        expect(pluginPuppeteer).toBeDefined();
        expect(rootPuppeteer).toBe(pluginPuppeteer);
        expect(rootPuppeteer).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it("package script から browser install を実行できる", async () => {
        const rootPackage = await readPackageJson(new URL("../../package.json", import.meta.url));

        expect(rootPackage.scripts?.["generate-manifest"]).toBe("bun scripts/generate-manifest.mts");
        expect(rootPackage.scripts?.["install-browser"]).toBe("bun scripts/install-browser.mts");
        expect(rootPackage.scripts?.postinstall).toBe("bun run install-browser");
    });
});
