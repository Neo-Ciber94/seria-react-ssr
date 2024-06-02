import * as esbuild from "esbuild";
import fs from "fs/promises";
import path from "path";
import ts from "typescript";

function replaceLoaderFunction(source: string) {
  const sourceFile = ts.createSourceFile(
    "tempFile.tsx",
    source,
    ts.ScriptTarget.ESNext,
    true
  );

  let modifiedSource = source;

  const visit = (node) => {
    if (
      ts.isFunctionDeclaration(node) &&
      node.name &&
      node.name?.escapedText === "loader" &&
      node.modifiers &&
      node.modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      const start = node.body?.pos;
      const end = node.body?.end;
      const replacement =
        ' { throw new Error("loader is not available client side"); }';

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

const removeServerFunctions: esbuild.Plugin = {
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

const options: esbuild.BuildOptions = {
  entryPoints: ["./src/entry.client.tsx"],
  bundle: true,
  format: "esm",
  outfile: "./dist/client/bundle.js",
  plugins: [removeServerFunctions],
};

if (process.env.WATCH) {
  const ctx = await esbuild.context(options);
  ctx.watch();
} else {
  await esbuild.build(options);
}
