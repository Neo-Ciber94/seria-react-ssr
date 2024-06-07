import * as esbuild from "esbuild";
import fs from "fs/promises";
import path from "path";
import ts from "typescript";

const isDev = process.env.NODE_ENV === "development";

const SERVER_FUNCTIONS = ["loader"];

function trimServerFunctionBody(source: string) {
  const sourceFile = ts.createSourceFile(
    "source.tsx",
    source,
    ts.ScriptTarget.ESNext,
    true
  );

  let modifiedSource = source;

  function getExportedFunctionName(node) {
    // export function <ident>
    if (
      ts.isFunctionDeclaration(node) &&
      node.name &&
      node.modifiers &&
      node.modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      return {
        name: node.name.escapedText,
        body: node.body,
        isBody: true,
      };
    }

    // export const <ident> = <declaration>
    if (
      ts.isVariableStatement(node) &&
      node.modifiers &&
      node.modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      const declaration = node.declarationList.declarations[0];
      if (declaration.initializer) {
        return {
          isBody: false,
          name: (declaration.name as ts.Identifier).escapedText,
          body: {
            pos: declaration.initializer.pos,
            end: declaration.initializer.end,
          },
        };
      }
    }

    return null;
  }

  const visit = (node) => {
    const func = getExportedFunctionName(node);

    if (func) {
      const serverFunctionName = SERVER_FUNCTIONS.find((n) => func.name === n);

      if (!serverFunctionName) {
        return;
      }

      const throwError = `throw new Error("${serverFunctionName} is not available client side");`;
      const replacement = func.isBody ? `{ ${throwError} }` : `() => { ${throwError} }`;
      const start = func.body?.pos;
      const end = func.body?.end;

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
        const modifiedCode = trimServerFunctionBody(source);

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
  logLevel: "info",
};

if (process.env.WATCH) {
  const ctx = await esbuild.context(options);
  ctx.watch();
} else {
  await esbuild.build(options);
}
