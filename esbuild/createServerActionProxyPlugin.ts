import * as esbuild from "esbuild";
import fs from "fs/promises";
import path from "path";
import ts from "typescript";
import { getLoader } from "./utils";

function replaceBodyWithProxy(
  node: ts.FunctionLikeDeclaration,
  functionName: string,
  actionPath: string
) {
  if (!node.body) {
    return undefined;
  }

  const actionRoute = actionPath
    .replace(/.(js|jsx|ts|tsx)$/, "")
    .replaceAll(path.sep, "/")
    .replace(/^src\/routes\//, "");

  const actionId = actionRoute + "#" + functionName;
  const args = node.parameters.map(
    (x) => (x.name as ts.Identifier).escapedText
  );

  const replacement = `{
             return callServerActionProxy({
                id: ${JSON.stringify(actionId)},
                args: [${args.join(",")}]
              })
            }`;

  return {
    start: node.body.pos,
    end: node.body.end,
    replacement,
  };
}

type Replacement = {
  start: number;
  end: number;
  replacement: string;
};

function traverseAndModifySource(
  source: string,
  loader: string,
  sourcePath: string
) {
  const tsFile = ts.createSourceFile(
    `_actions.${loader}`,
    source,
    ts.ScriptTarget.Latest
  );

  const actionPath = path.relative(process.cwd(), sourcePath);
  const replacements: Replacement[] = [];

  function visit(node: any) {
    if (ts.isVariableStatement(node)) {
      const declaration = node.declarationList.declarations[0];
      const functionName =
        (declaration.name as ts.Identifier).escapedText ?? "<unknown>";

      if (ts.isFunctionLike(declaration.initializer)) {
        const isAsync = declaration.initializer?.modifiers?.some(
          (modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword
        );

        if (!isAsync) {
          throw new Error(
            `'_actions' files can only export async functions: '${functionName}' is not async at on file: ${actionPath}`
          );
        }

        replacements.push(
          replaceBodyWithProxy(
            declaration.initializer,
            functionName,
            actionPath
          )!
        );
      }
    } else if (ts.isFunctionDeclaration(node)) {
      const isAsync = node.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword
      );

      const functionName = node.name?.escapedText ?? "<unknown>";

      if (!isAsync) {
        throw new Error(
          `'_actions' files can only export async functions: '${functionName}' is not async at on file: ${actionPath}`
        );
      }

      replacements.push(replaceBodyWithProxy(node, functionName, actionPath)!);
    } else if (ts.isExportDeclaration(node) && !node.isTypeOnly) {
      throw new Error(
        `_actions file can only export async functions: ${actionPath}`
      );
    }

    ts.forEachChild(node, visit);
  }

  visit(tsFile);

  return replacements;
}

export const createServerActionProxyPlugin: esbuild.Plugin = {
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
        const replacements = traverseAndModifySource(
          source,
          loader,
          args.path
        ).reverse();

        let modified = source;

        for (const { start, end, replacement } of replacements) {
          modified =
            modified.slice(0, start) + replacement + modified.slice(end);
        }

        modified = `
            import { callServerActionProxy } from "@/framework/runtime"\n
            ${modified}
          `;

        return {
          contents: modified,
          loader,
        };
      }
    );
  },
};
