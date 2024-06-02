import * as esbuild from "esbuild";
import fs from "fs/promises";
import path from "path";
import ts from "typescript";

const isDev = process.env.NODE_ENV === "development";

const SERVER_FUNCTIONS = ["loader"];

function replaceLoaderFunction(source: string) {
  const sourceFile = ts.createSourceFile(
    "source.tsx",
    source,
    ts.ScriptTarget.ESNext,
    true
  );

  let modifiedSource = source;

  const visit = (node) => {
    if (
      ts.isFunctionDeclaration(node) &&
      node.name &&
      node.modifiers &&
      node.modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      const isServerFunction = SERVER_FUNCTIONS.find(
        (n) => node.name?.escapedText === n
      );

      if (!isServerFunction) {
        return;
      }

      const start = node.body?.pos;
      const end = node.body?.end;
      const replacement = `{ throw new Error("${isServerFunction} is not available client side"); }`;

      modifiedSource =
        modifiedSource.slice(0, start) +
        replacement +
        modifiedSource.slice(end);
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return modifiedSource;
}

const removeServerFunctionsPlugin: esbuild.Plugin = {
  name: "remove-server-functions",
  setup(build) {
    build.onLoad(
      { filter: /\.(js|jsx|tsx)$/, namespace: "file" },
      async (args) => {
        if (!args.path.startsWith(path.join(process.cwd(), "src/routes"))) {
          return;
        }

        const loader = args.path.endsWith(".tsx")
          ? "tsx"
          : args.path.endsWith(".jsx")
            ? "jsx"
            : "js";

        const source = await fs.readFile(args.path, "utf8");
        const modifiedCode = replaceLoaderFunction(source);

        return {
          contents: modifiedCode,
          loader,
        };
      }
    );
  },
};

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
  plugins: [removeServerFunctionsPlugin, ignoreServerFilesPlugin],
};

if (process.env.WATCH) {
  const ctx = await esbuild.context(options);
  ctx.watch();
} else {
  await esbuild.build(options);
}
