import * as esbuild from "esbuild";
import fs from "fs/promises";
import path from "path";

const isDev = process.env.NODE_ENV === "development";

const options: esbuild.BuildOptions = {
  entryPoints: ["./src/**/*"],
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
