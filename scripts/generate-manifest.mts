import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultRoot = resolve(__dirname, "..");

export async function generateManifest(rootDir: string = defaultRoot): Promise<void> {
    const templatePath = resolve(rootDir, "manifest.template.json");
    const outputPath = resolve(rootDir, "com.hrk-m.kot-punch.sdPlugin/manifest.json");
    const template = await readFile(templatePath, "utf8");

    await mkdir(resolve(rootDir, "com.hrk-m.kot-punch.sdPlugin"), { recursive: true });
    await writeFile(outputPath, template, "utf8");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    await generateManifest();
    console.log("manifest.json generated.");
}
