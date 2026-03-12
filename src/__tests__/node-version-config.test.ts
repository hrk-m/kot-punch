import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

type Manifest = {
    Nodejs?: {
        Version?: string;
    };
};

describe("node version configuration", () => {
    it("pins project-managed Node.js versions to 24", async () => {
        const [nodeVersion, toolVersions, packageJson, manifestTemplate, generatedManifest] =
            await Promise.all([
                readFile(new URL("../../.node-version", import.meta.url), "utf8"),
                readFile(new URL("../../.tool-versions", import.meta.url), "utf8"),
                readFile(new URL("../../package.json", import.meta.url), "utf8"),
                readFile(new URL("../../manifest.template.json", import.meta.url), "utf8"),
                readFile(
                    new URL("../../com.hrk-m.kot-punch.sdPlugin/manifest.json", import.meta.url),
                    "utf8",
                ),
            ]);

        const packageManifest = JSON.parse(packageJson) as {
            devDependencies?: Record<string, string>;
        };
        const templateManifest = JSON.parse(manifestTemplate) as Manifest;
        const pluginManifest = JSON.parse(generatedManifest) as Manifest;

        expect(nodeVersion.trim()).toMatch(/^24\./);
        expect(toolVersions).toContain("nodejs 24.");
        expect(packageManifest.devDependencies?.["@types/node"]).toMatch(/^~24\./);
        expect(templateManifest.Nodejs?.Version).toBe("24");
        expect(pluginManifest.Nodejs?.Version).toBe("24");
        expect(pluginManifest.Nodejs?.Version).toBe(templateManifest.Nodejs?.Version);
    });
});
