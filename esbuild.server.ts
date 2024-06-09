import * as esbuild from "esbuild";
import { glob } from "glob";

const ESM_REQUIRE_SHIM = `
await (async () => {
  const { dirname } = await import("path");
  const { fileURLToPath } = await import("url");

  /**
   * Shim entry-point related paths.
   */
  if (typeof globalThis.__filename === "undefined") {
    globalThis.__filename = fileURLToPath(import.meta.url);
  }
  if (typeof globalThis.__dirname === "undefined") {
    globalThis.__dirname = dirname(globalThis.__filename);
  }
  /**
   * Shim require if needed.
   */
  if (typeof globalThis.require === "undefined") {
    const { default: module } = await import("module");
    globalThis.require = module.createRequire(import.meta.url);
  }
})();
`;

const entryPoints = await glob(["./src/**/*.{js,jsx,ts,tsx}"], {
  posix: true,
  dotRelative: true,
  ignore: ["./src/generateRoutes.ts", "./src/**/*.client.{js,jsx,ts,tsx}", "./src/client/seria"],
});

const external = await glob(
  ["./src/generateRoutes.ts", "./src/**/*.client.{js,jsx,ts,tsx}", "./src/client/seria"],
  {
    posix: true,
    dotRelative: true,
  },
);

const options: esbuild.BuildOptions = {
  entryPoints,
  bundle: true,
  format: "esm",
  splitting: true,
  platform: "node",
  minify: true,
  outdir: "./build/server",
  banner: {
    js: ESM_REQUIRE_SHIM,
  },
  external,
  logLevel: "info",
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
};

await esbuild.build(options);
