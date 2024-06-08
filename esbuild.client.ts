import * as esbuild from "esbuild";
import { createServerActionProxyPlugin } from "./esbuild/createServerActionProxyPlugin";
import { removeServerExports } from "./esbuild/removeServerExports";

const isDev = process.env.NODE_ENV === "development";

const ignoreServerFilesPlugin: esbuild.Plugin = {
  name: "ignore-server-files",
  setup(build) {
    build.onResolve({ filter: /\.server\.(ts|js|tsx|jsx)$/ }, () => ({
      external: true,
    }));
  },
};

const options: esbuild.BuildOptions = {
  entryPoints: ["./src/entry.client.tsx"],
  bundle: true,
  format: "esm",
  minify: !isDev,
  outfile: "./build/client/bundle.js",
  plugins: [
    createServerActionProxyPlugin,
    removeServerExports,
    ignoreServerFilesPlugin,
  ],
  logLevel: "info",
};

if (process.env.WATCH) {
  const ctx = await esbuild.context(options);
  ctx.watch();
} else {
  await esbuild.build(options);
}
