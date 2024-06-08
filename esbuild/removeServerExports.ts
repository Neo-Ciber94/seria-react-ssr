import * as esbuild from "esbuild";
import fs from "fs/promises";
import path from "path";
import { getLoader } from "./utils";
import { parse } from "@babel/parser";
import babelTraverse from "@babel/traverse";
import babelGenerate from "@babel/generator";
import * as t from "@babel/types";

const SERVER_EXPORTS = ["loader"];

// @ts-ignore
const traverse = babelTraverse.default as typeof babelTraverse;

// @ts-ignore
const generate = babelGenerate.default as typeof babelGenerate;

const throwErrorReplacement = (identifierName: string) =>
  t.blockStatement([
    t.throwStatement(
      t.newExpression(t.identifier("Error"), [
        t.stringLiteral(`'${identifierName}' is not available on the client`),
      ])
    ),
  ]);

export const removeServerExports: esbuild.Plugin = {
  name: "remove-server-exports",
  setup(build) {
    build.onLoad(
      { filter: /\.(jsx|tsx)$/, namespace: "file" },
      async (args) => {
        if (!args.path.startsWith(path.join(process.cwd(), "src/routes"))) {
          return;
        }

        const loader = getLoader(args.path);
        const contents = await fs.readFile(args.path, "utf8");

        const ast = parse(contents, {
          plugins: ["typescript", "jsx"],
          sourceType: "module",
        });

        let anyReplaced = false;

        traverse(ast, {
          FunctionDeclaration(path) {
            const functionName = path.node.id?.name;
            if (functionName && SERVER_EXPORTS.includes(functionName)) {
              path.node.body = throwErrorReplacement(functionName);
              anyReplaced = true;
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
                  declaration.init = t.arrowFunctionExpression(
                    [],
                    throwErrorReplacement(functionName)
                  );
                }
              }
            });
          },
        });

        const { code: modified } = generate(ast, {});

        if (anyReplaced) {
          console.log(modified);
        }

        return {
          contents: modified,
          loader,
        };
      }
    );
  },
};
