import { defineConfig } from "vite";
import frameworkPlugin from "framework/plugin";

export default defineConfig((config) => {
  return {
    plugins: [frameworkPlugin(config)],
  };
});
