import { defineConfig } from "vite";
import frameworkPlugin from "framework/plugin";
import tsPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsPaths(), frameworkPlugin()],
});
