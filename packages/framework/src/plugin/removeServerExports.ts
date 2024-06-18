import * as esbuild from "esbuild";
import fs from "fs/promises";
import path from "path";
import { getLoader, type JavascriptLoader } from "./utils";
import { parse } from "@babel/parser";
import babelTraverse from "@babel/traverse";
import babelGenerate from "@babel/generator";
import * as t from "@babel/types";

// @ts-ignore
const traverse = babelTraverse.default as typeof babelTraverse;

// @ts-ignore
const generate = babelGenerate.default as typeof babelGenerate;

const SERVER_EXPORTS = ["loader"];

const throwErrorReplacement = (identifierName: string) =>
  t.blockStatement([
    t.throwStatement(
      t.newExpression(t.identifier("Error"), [
        t.stringLiteral(`'${identifierName}' is not available on the client`),
      ]),
    ),
  ]);

export async function removeServerExportsFromSource(source: string, loader: JavascriptLoader) {
  const { code } = await esbuild.transform(source, { loader });

  const ast = parse(code, {
    plugins: ["typescript", "jsx"],
    sourceType: "module",
  });

  traverse(ast, {
    FunctionDeclaration(path) {
      const functionName = path.node.id?.name;
      if (functionName && SERVER_EXPORTS.includes(functionName)) {
        path.node.body = throwErrorReplacement(functionName);
      }
    },
    VariableDeclaration(path) {
      path.node.declarations.forEach((declaration) => {
        if (!t.isIdentifier(declaration.id)) {
          return;
        }

        const functionName = declaration.id.name;

        if (functionName && SERVER_EXPORTS.includes(functionName)) {
          if (
            t.isFunctionExpression(declaration.init) ||
            t.isArrowFunctionExpression(declaration.init)
          ) {
            declaration.init.body = throwErrorReplacement(functionName);
          } else if (t.isIdentifier(declaration.init)) {
            declaration.init = t.arrowFunctionExpression([], throwErrorReplacement(functionName));
          }
        }
      });
    },
  });

  const result = generate(ast, {});
  return { code: result.code };
}

async function removeServerExportsFromPath(filePath: string) {
  if (!filePath.startsWith(path.join(process.cwd(), "src/routes"))) {
    return;
  }

  const loader = getLoader(filePath);
  const contents = await fs.readFile(filePath, "utf8");
  return removeServerExportsFromSource(contents, loader);
}

export const removeServerExports: esbuild.Plugin = {
  name: "remove-server-exports",
  setup(build) {
    build.onLoad({ filter: /\.(jsx|tsx)$/, namespace: "file" }, async (args) => {
      const result = await removeServerExportsFromPath(args.path);
      const loader = getLoader(args.path);

      if (!result) {
        return;
      }

      return {
        contents: result.code,
        loader,
      };
    });
  },
};
