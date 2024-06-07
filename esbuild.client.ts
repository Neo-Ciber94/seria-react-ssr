import * as esbuild from "esbuild";
import fs from "fs/promises";
import path from "path";
import ts from "typescript";

const isDev = process.env.NODE_ENV === "development";

const SERVER_FUNCTIONS = ["loader"];

const getLoader = (path: string) =>
  path.endsWith(".ts")
    ? "ts"
    : path.endsWith(".tsx")
      ? "tsx"
      : path.endsWith(".jsx")
        ? "jsx"
        : "js";

function replaceBodyWithProxy(
  node: ts.FunctionLikeDeclaration,
  functionName: string,
  actionPath: string,
  contents: string
) {
  // Replace the body with a proxy
  if (!node.body) {
    return contents;
  }

  const actionRoute = actionPath
    .replace(/.(js|jsx|ts|tsx)$/, "")
    .replaceAll(path.sep, "/")
    .replace(/^src\/routes\//, "");

  const actionId = actionRoute + "#" + functionName;
  const args = node.parameters.map((x) =>
    contents.slice(x.name.pos, x.name.end)
  );
  const replacement = `{
           return createServerActionProxy({
              id: ${JSON.stringify(actionId)},
              args: [${args.join(",")}]
            })
          }`;

  contents =
    contents.slice(0, node.body.pos) +
    replacement +
    contents.slice(node.body.end);

  contents = `
          import { createServerActionProxy } from "@/framework/runtime";\n
          ${contents}`;

  return contents;
}

const createServerActionProxyPlugin: esbuild.Plugin = {
  name: "create-server-action-proxy",
  setup(build) {
    build.onLoad(
      { filter: /_actions\.(js|ts|jsx|tsx)$/, namespace: "file" },
      async (args) => {
        if (!args.path.startsWith(path.join(process.cwd(), "src/routes"))) {
          return;
        }

        const loader = getLoader(args.path);
        const source = await fs.readFile(args.path, "utf8");
        const modified = await (async () => {
          const tsFile = ts.createSourceFile(
            `_actions.${loader}`,
            source,
            ts.ScriptTarget.Latest
          );

          const actionPath = path.relative(process.cwd(), args.path);
          let contents = source;

          function visit(node: any) {
            if (ts.isVariableStatement(node)) {
              const declaration = node.declarationList.declarations[0];
              const functionName = declaration.name.getText(tsFile);

              if (ts.isFunctionLike(declaration.initializer)) {
                const isAsync = declaration.initializer?.modifiers?.some(
                  (modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword
                );

                if (!isAsync) {
                  throw new Error(
                    `'_actions' files can only export async functions: '${functionName}' is not async at on file: ${actionPath}`
                  );
                }

                contents = replaceBodyWithProxy(
                  declaration.initializer,
                  functionName,
                  actionPath,
                  contents
                );
              }
            }

            if (ts.isFunctionDeclaration(node)) {
              const isAsync = node.modifiers?.some(
                (modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword
              );

              const functionName = node.name?.getText(tsFile) ?? "<unknown>";

              if (!isAsync) {
                throw new Error(
                  `'_actions' files can only export async functions: '${functionName}' is not async at on file: ${actionPath}`
                );
              }

              contents = replaceBodyWithProxy(
                node,
                functionName,
                actionPath,
                contents
              );
            }

            if (ts.isExportDeclaration(node) && !node.isTypeOnly) {
              throw new Error(
                `_actions file can only export async functions: ${actionPath}`
              );
            }

            ts.forEachChild(node, visit);
          }

          visit(tsFile);
          return contents;
        })();

        return {
          contents: modified,
          loader,
        };
      }
    );
  },
};

function trimServerFunctionBody(source: string) {
  const sourceFile = ts.createSourceFile(
    "source.tsx",
    source,
    ts.ScriptTarget.ESNext,
    true
  );

  let modifiedSource = source;

  function getExportedFunctionName(node: any) {
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

  const visit = (node: any) => {
    const func = getExportedFunctionName(node);

    if (func) {
      const serverFunctionName = SERVER_FUNCTIONS.find((n) => func.name === n);

      if (!serverFunctionName) {
        return;
      }

      const throwError = `throw new Error("${serverFunctionName} is not available client side");`;
      const replacement = func.isBody
        ? `{ ${throwError} }`
        : `() => { ${throwError} }`;
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
      { filter: /\.(jsx|tsx)$/, namespace: "file" },
      async (args) => {
        if (!args.path.startsWith(path.join(process.cwd(), "src/routes"))) {
          return;
        }

        const loader = getLoader(args.path);
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
  plugins: [
    createServerActionProxyPlugin,
    removeServerFunctionsPlugin,
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
