import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("manifest template", () => {
    it("open-request action disables the title like open-kot", async () => {
        const templatePath = new URL("../../../manifest.template.json", import.meta.url);
        const manifest = JSON.parse(await readFile(templatePath, "utf8")) as {
            Actions: Array<{
                UUID: string;
                UserTitleEnabled?: boolean;
                States: Array<Record<string, unknown>>;
            }>;
        };

        const action = manifest.Actions.find(
            (entry) => entry.UUID === "com.hrk-m.kot-punch.open-request"
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
});
