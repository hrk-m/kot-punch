import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import nodeResolve from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import { join } from "node:path";
import { loadEnvFile } from "node:process";

const sdPlugin = "com.hrk-m.kot-punch.sdPlugin";

export function resolveKotPunchDebugValue(rootDir = process.cwd()) {
	if (process.env.KOT_PUNCH_DEBUG !== undefined) {
		return process.env.KOT_PUNCH_DEBUG;
	}

	try {
		loadEnvFile(join(rootDir, ".env"));
	} catch (error) {
		if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
			throw error;
		}
	}

	return process.env.KOT_PUNCH_DEBUG ?? "false";
}

const kotPunchDebugValue = resolveKotPunchDebugValue();

/**
 * @type {import('rollup').RollupOptions}
 */
const config = {
	input: "src/plugin.ts",
	external: ["puppeteer", "node-notifier"],
	onwarn(warning, warn) {
		// node_modules 由来の this 書き換え警告と循環依存警告を抑制する
		if (warning.code === "THIS_IS_UNDEFINED" && warning.id?.includes("node_modules")) return;
		if (warning.code === "CIRCULAR_DEPENDENCY" && warning.ids?.every((id) => id.includes("node_modules"))) return;
		warn(warning);
	},
	output: {
		file: `${sdPlugin}/bin/plugin.js`,
		inlineDynamicImports: true,
	},
	plugins: [
		replace({
			preventAssignment: true,
			values: {
				"process.env.KOT_PUNCH_DEBUG": JSON.stringify(kotPunchDebugValue),
			},
		}),
		typescript({ tsconfig: "./tsconfig.build.json" }),
		nodeResolve({
			browser: false,
			exportConditions: ["node"],
			preferBuiltins: true
		}),
		json(),
		commonjs(),
		terser(),
		{
			name: "emit-module-package-file",
			generateBundle() {
				this.emitFile({ fileName: "package.json", source: `{ "type": "module" }`, type: "asset" });
			}
		}
	]
};

export default config;
