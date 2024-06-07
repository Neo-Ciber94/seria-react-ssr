import * as esbuild from "esbuild";
import seriaReactClientPlugin from "./esbuild/seriaReactClientPlugin";

const isDev = process.env.NODE_ENV === "development";

const options: esbuild.BuildOptions = {
  entryPoints: ["./src/entry.client.tsx"],
  bundle: true,
  format: "esm",
  minify: !isDev,
  outfile: "./build/client/bundle.js",
  plugins: [...seriaReactClientPlugin()],
  logLevel: "info",
};

if (process.env.WATCH) {
  const ctx = await esbuild.context(options);
  ctx.watch();
} else {
  await esbuild.build(options);
}
