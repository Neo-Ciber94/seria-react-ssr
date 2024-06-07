import { Plugin } from "esbuild";
import { trimServerFunctionsPlugin } from "./trimServerFunctionsPlugin";
import { createServerActionProxyPlugin } from "./createServerActionProxyPlugin";

const ignoreServerFilesPlugin: Plugin = {
  name: "ignore-server-files",
  setup(build) {
    build.onResolve({ filter: /\.server\.(ts|js|tsx|jsx)$/ }, () => ({
      external: true,
    }));
  },
};

export default function seriaReactClientPlugin(): Plugin[] {
  return [
    createServerActionProxyPlugin,
    trimServerFunctionsPlugin,
    ignoreServerFilesPlugin,
  ];
}
