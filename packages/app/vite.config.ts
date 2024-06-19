import frameworkPlugin from "framework/plugin";
import { defineConfig } from "vite";
import tsPaths from "vite-tsconfig-paths";

export default defineConfig({
	plugins: [tsPaths(), frameworkPlugin()],
});
