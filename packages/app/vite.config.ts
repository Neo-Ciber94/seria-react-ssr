import { defineConfig } from "vite";
import frameworkPlugin from "framework/plugin";

export default defineConfig((config) => {
  console.log(config);
  return {
    plugins: [frameworkPlugin()],
  };
});
