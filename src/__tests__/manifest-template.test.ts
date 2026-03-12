import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("manifest template", () => {
    it("uses a Stream Deck supported Node.js runtime version", async () => {
        const templatePath = new URL("../../manifest.template.json", import.meta.url);
        const manifest = JSON.parse(await readFile(templatePath, "utf8")) as {
            Nodejs?: {
                Version?: string;
            };
        };

        expect(["20", "24"]).toContain(manifest.Nodejs?.Version);
    });

    it("open-request action disables the title like open-kot", async () => {
        const templatePath = new URL("../../manifest.template.json", import.meta.url);
        const manifest = JSON.parse(await readFile(templatePath, "utf8")) as {
            Actions: Array<{
                UUID: string;
                UserTitleEnabled?: boolean;
                DisableAutomaticStates?: boolean;
                States: Array<Record<string, unknown>>;
            }>;
        };

        const action = manifest.Actions.find(
            (entry) => entry.UUID === "com.hrk-m.kot-punch.open-request",
        );

        expect(action).toMatchObject({
            UUID: "com.hrk-m.kot-punch.open-request",
            UserTitleEnabled: false,
            States: [
                {
                    Image: "imgs/actions/open-request/key",
                    TitleAlignment: "middle",
                },
            ],
        });
        expect(action?.States[0]).not.toHaveProperty("Title");
        expect(action?.States[0]).not.toHaveProperty("TitleColor");
    });

    it("clock-in と clock-out は automatic state toggle を無効化する", async () => {
        const templatePath = new URL("../../manifest.template.json", import.meta.url);
        const manifest = JSON.parse(await readFile(templatePath, "utf8")) as {
            Actions: Array<{
                UUID: string;
                DisableAutomaticStates?: boolean;
            }>;
        };

        const clockIn = manifest.Actions.find(
            (entry) => entry.UUID === "com.hrk-m.kot-punch.clock-in",
        );
        const clockOut = manifest.Actions.find(
            (entry) => entry.UUID === "com.hrk-m.kot-punch.clock-out",
        );

        expect(clockIn).toMatchObject({
            UUID: "com.hrk-m.kot-punch.clock-in",
            DisableAutomaticStates: true,
        });
        expect(clockOut).toMatchObject({
            UUID: "com.hrk-m.kot-punch.clock-out",
            DisableAutomaticStates: true,
        });
    });
});
