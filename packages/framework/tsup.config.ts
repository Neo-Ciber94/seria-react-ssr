import { defineConfig } from "tsup";
import { glob } from "glob";
import { nodeExternalsPlugin } from "esbuild-node-externals";

const entryPoints = await glob(["./src/**/*.ts", "./src/**/*.tsx"], {
	posix: true,
	ignore: ["./src/**/*.test.ts", "./src/**/test/**", "./src/**/*.d.ts"],
});

export default defineConfig({
	entry: entryPoints,
	splitting: false,
	sourcemap: true,
	clean: true,
	dts: true,
	format: "esm",
	target: "es2022",
	external: ["lightningcss", "@babel"],
	plugins: [nodeExternalsPlugin()],
	esbuildOptions(options, context) {
		options.jsx = "automatic";
	},
});
