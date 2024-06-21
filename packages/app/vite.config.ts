import frameworkPlugin from "framework/dev/plugin";
import { defineConfig } from "vite";
import tsPaths from "vite-tsconfig-paths";

export default defineConfig({
	plugins: [tsPaths(), frameworkPlugin()],
	ssr: {},
});
