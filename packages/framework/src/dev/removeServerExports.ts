import babelGenerate from "@babel/generator";
import { parse } from "@babel/parser";
import babelTraverse from "@babel/traverse";
import * as t from "@babel/types";
import * as esbuild from "esbuild";
import { getLoader } from "./utils";

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

type RemoveExportsOptions = {
	source: string;
	fileName: string;
};

export async function removeServerExports(options: RemoveExportsOptions) {
	const { source, fileName } = options;
	const loader = getLoader(fileName);
	const { code } = await esbuild.transform(source, {
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

	const result = generate(ast, {
		sourceMaps: true,
		sourceFileName: fileName,
		filename: fileName,
	});

	return result;
}
