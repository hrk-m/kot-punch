import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const labels = JSON.parse(readFileSync(resolve(root, "src/labels/labels.json"), "utf8"));
const template = readFileSync(resolve(root, "manifest.template.json"), "utf8");

const manifest = template.replace(/\{\{(.+?)\}\}/g, (_, key) => {
    const [action, field] = key.split(".");
    return labels[action]?.[field] ?? key;
});

writeFileSync(
    resolve(root, "com.hrk-m.kot-punch.sdPlugin/manifest.json"),
    manifest,
    "utf8",
);

console.log("manifest.json generated.");
