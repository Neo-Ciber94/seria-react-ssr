import * as esbuild from "esbuild";
import { glob } from "glob";

const isDev = process.env.NODE_ENV === "development";

const entryPoints = await glob(["./src/**/*"], {
  ignore: ["./src/generateRoutes.ts", "./src/**/*.client.(ts|js|tsx|jsx)"],
});

const options: esbuild.BuildOptions = {
  entryPoints,
  bundle: true,
  format: "esm",
  splitting: true,
  platform: "node",
  minify: true,
  outdir: "./build/server",
  external: ["./src/generateRoutes.ts"],
  logLevel: "info",
};

await esbuild.build(options);
