import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import puppeteer from "puppeteer";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultRoot = resolve(__dirname, "..");

async function hasExecutable(path: string): Promise<boolean> {
    try {
        await access(path, constants.X_OK);
        return true;
    } catch {
        return false;
    }
}

async function installChrome(rootDir: string): Promise<void> {
    await new Promise<void>((resolvePromise, rejectPromise) => {
        const child = spawn("bunx", ["puppeteer", "browsers", "install", "chrome"], {
            cwd: rootDir,
            stdio: "inherit",
            shell: process.platform === "win32",
        });

        child.once("error", rejectPromise);
        child.once("exit", (code) => {
            if (code === 0) {
                resolvePromise();
                return;
            }

            rejectPromise(new Error(`puppeteer browser install failed with exit code ${code ?? "unknown"}`));
        });
    });
}

export async function ensureChromeInstalled(rootDir: string = defaultRoot): Promise<void> {
    const executablePath = puppeteer.executablePath();

    if (await hasExecutable(executablePath)) {
        console.log(`Chrome for Testing already installed: ${executablePath}`);
        return;
    }

    console.log(`Chrome for Testing not found: ${executablePath}`);
    console.log("Installing Chrome for Testing via Puppeteer...");
    await installChrome(rootDir);

    if (!(await hasExecutable(executablePath))) {
        throw new Error(`Chrome for Testing is still unavailable after installation: ${executablePath}`);
    }

    console.log(`Chrome for Testing installed: ${executablePath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    await ensureChromeInstalled();
}
