import * as esbuild from "esbuild";
import fs from "fs/promises";
import path from "path";
import ts from "typescript";
import { getLoader } from "./utils";

const SERVER_EXPORTS = ["loader"];

function replaceServerFunctionBody(source: string) {
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
      const serverFunctionName = SERVER_EXPORTS.find((n) => func.name === n);

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

export const removeServerExports: esbuild.Plugin = {
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
        const modifiedCode = replaceServerFunctionBody(source);

        return {
          contents: modifiedCode,
          loader,
        };
      }
    );
  },
};
