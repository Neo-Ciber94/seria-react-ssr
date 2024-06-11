import { frameworkPlugin } from "@/framework/dev/plugin";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig((config) => {
  return {
    plugins: [tsconfigPaths(), frameworkPlugin(config)],
  };
});
