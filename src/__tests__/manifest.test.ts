import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateManifest } from "../../scripts/generate-manifest.mts";

const tempDirs: string[] = [];

async function makeTempRoot(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), "kot-punch-manifest-"));
    tempDirs.push(dir);
    return dir;
}

afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { force: true, recursive: true })));
});

describe("generateManifest", () => {
    it("labels.json がなくても manifest.template.json から manifest.json を生成する", async () => {
        const rootDir = await makeTempRoot();
        const pluginDir = join(rootDir, "com.hrk-m.kot-punch.sdPlugin");
        const manifestTemplate = join(rootDir, "manifest.template.json");
        const manifestOutput = join(pluginDir, "manifest.json");
        const template = `{
  "Name": "KOT Punch",
  "Actions": [
    {
      "Name": "出勤"
    }
  ]
}
`;

        await mkdir(pluginDir, { recursive: true });
        await writeFile(manifestTemplate, template, "utf8");

        await generateManifest(rootDir);

        await expect(readFile(manifestOutput, "utf8")).resolves.toBe(template);
    });
});
