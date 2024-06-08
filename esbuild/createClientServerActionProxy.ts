import * as esbuild from "esbuild";
import fs from "fs/promises";
import path from "path";
import { getLoader } from "./utils";
import { parse } from "@babel/parser";
import babelTraverse from "@babel/traverse";
import babelGenerate from "@babel/generator";
import * as t from "@babel/types";

// @ts-ignore
const traverse = babelTraverse.default as typeof babelTraverse;

// @ts-ignore
const generate = babelGenerate.default as typeof babelGenerate;

const createProxyCallExpression = (
  functionName: string,
  actionPath: string
) => {
  const actionRoute = actionPath
    .replace(/.(js|jsx|ts|tsx)$/, "")
    .replaceAll(path.sep, "/")
    .replace(/^src\/routes\//, "");

  const actionId = actionRoute + "#" + functionName;

  return t.blockStatement([
    t.returnStatement(
      t.callExpression(t.identifier("callServerAction"), [
        t.objectExpression([
          t.objectProperty(t.identifier("id"), t.stringLiteral(actionId)),
          t.objectProperty(
            t.identifier("args"),
            t.arrayExpression([t.spreadElement(t.identifier("arguments"))])
          ),
        ]),
      ])
    ),
  ]);
};

export const createClientServerActionProxy: esbuild.Plugin = {
  name: "create-client-server-action-proxy",
  setup(build) {
    build.onLoad(
      { filter: /_actions\.(js|ts|jsx|tsx)$/, namespace: "file" },
      async (args) => {
        if (!args.path.startsWith(path.join(process.cwd(), "src/routes"))) {
          return;
        }

        const loader = getLoader(args.path);
        const contents = await fs.readFile(args.path, "utf8");
        const actionPath = path.relative(process.cwd(), args.path);

        let importInserted = false;

        const insertImport = () => {
          if (!importInserted) {
            const importDeclaration = t.importDeclaration(
              [
                t.importSpecifier(
                  t.identifier("callServerAction"),
                  t.identifier("callServerAction")
                ),
              ],
              t.stringLiteral("@/framework/runtime")
            );
            ast.program.body.unshift(importDeclaration);
            importInserted = true;
          }
        };

        const ast = parse(contents, {
          plugins: ["typescript", "jsx"],
          sourceType: "module",
        });

        traverse(ast, {
          FunctionDeclaration(path) {
            const isExported = path.findParent((p) => p.isExportDeclaration());

            if (!isExported) {
              return;
            }

            const functionName = path.node.id?.name;

            if (!path.node.async) {
              throw new Error(
                `_actions can only export async functions: '${actionPath}'`
              );
            }

            if (functionName) {
              path.node.body = createProxyCallExpression(
                functionName,
                actionPath
              );

              insertImport();
            }
          },
          VariableDeclaration(path) {
            const isExported = path.findParent((p) => p.isExportDeclaration());

            if (!isExported) {
              return;
            }

            path.node.declarations.forEach((declaration) => {
              if (
                t.isVariableDeclarator(declaration) &&
                t.isIdentifier(declaration.id)
              ) {
                const functionName = declaration.id.name;

                if (t.isLiteral(declaration.init)) {
                  throw new Error(
                    `_actions can only export async functions: '${actionPath}'`
                  );
                }

                declaration.init = t.functionExpression(
                  null,
                  [],
                  createProxyCallExpression(functionName, actionPath)
                );

                insertImport();
              }
            });
          },
          ExportAllDeclaration() {
            throw new Error(
              `_actions can only export async functions: '${actionPath}'`
            );
          },
          ExportNamespaceSpecifier() {
            throw new Error(
              `_actions can only export async functions: '${actionPath}'`
            );
          },
        });

        const output = generate(ast, {});

        return {
          contents: output.code,
          loader,
        };
      }
    );
  },
};
