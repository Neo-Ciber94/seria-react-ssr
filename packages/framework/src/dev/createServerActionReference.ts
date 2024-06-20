import path from "node:path";
import { parse } from "@babel/parser";
import * as t from "@babel/types";
import * as esbuild from "esbuild";
import { getLoader } from "./utils";
import { generate, traverse } from "./babel";

const createProxyCallExpression = (functionName: string, actionPath: string) => {
	const actionRoute = actionPath
		.replace(/.(js|jsx|ts|tsx)$/, "")
		.replaceAll(path.sep, "/")
		.replace(/^src\/routes\//, "");

	const actionId = `${actionRoute}#${functionName}`;

	return t.blockStatement([
		t.returnStatement(
			t.callExpression(t.identifier("callServerAction"), [
				t.objectExpression([
					t.objectProperty(t.identifier("id"), t.stringLiteral(actionId)),
					t.objectProperty(
						t.identifier("args"),
						t.arrayExpression([t.spreadElement(t.identifier("arguments"))]),
					),
				]),
			]),
		),
	]);
};

type CreateClientServerActionProxyOptions = {
	contents: string;
	fileName: string;
};

export async function createServerActionReference(options: CreateClientServerActionProxyOptions) {
	const { contents, fileName } = options;
	const actionPath = path.relative(process.cwd(), fileName);

	let importInserted = false;

	const insertImport = () => {
		if (!importInserted) {
			const importDeclaration = t.importDeclaration(
				[t.importSpecifier(t.identifier("callServerAction"), t.identifier("callServerAction"))],
				t.stringLiteral("framework/runtime"),
			);
			ast.program.body.unshift(importDeclaration);
			importInserted = true;
		}
	};

	const loader = getLoader(fileName);
	const { code } = await esbuild.transform(contents, {
		loader,
		jsx: "automatic",
		sourcefile: fileName,
	});

	const ast = parse(code, {
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
				throw new Error(`_actions can only export async functions: '${actionPath}'`);
			}

			if (functionName) {
				path.node.body = createProxyCallExpression(functionName, actionPath);

				insertImport();
			}
		},
		VariableDeclaration(path) {
			const isExported = path.findParent((p) => p.isExportDeclaration());

			if (!isExported) {
				return;
			}

			path.node.declarations.forEach((declaration) => {
				if (t.isVariableDeclarator(declaration) && t.isIdentifier(declaration.id)) {
					const functionName = declaration.id.name;

					if (t.isLiteral(declaration.init)) {
						throw new Error(`_actions can only export async functions: '${actionPath}'`);
					}

					declaration.init = t.functionExpression(
						null,
						[],
						createProxyCallExpression(functionName, actionPath),
					);

					insertImport();
				}
			});
		},
		ExportAllDeclaration() {
			throw new Error(`_actions can only export async functions: '${actionPath}'`);
		},
		ExportNamespaceSpecifier() {
			throw new Error(`_actions can only export async functions: '${actionPath}'`);
		},
	});

	const result = generate(ast);

	return result;
}

