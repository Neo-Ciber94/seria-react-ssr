import { parse } from "@babel/parser";
import * as t from "@babel/types";
import * as esbuild from "esbuild";
import { getLoader } from "./utils";
import { generate, traverse } from "./babel";
import * as babel from "@babel/core"
import { invariant } from "../internal";

const throwErrorStatement = (identifierName: string) =>
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
	removeExports: string[]
};

// TODO: rename to replaceServerExports
export async function removeServerExports(options: RemoveExportsOptions) {
	const { source, fileName, removeExports } = options;
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
			if (functionName && removeExports.includes(functionName)) {
				path.node.body = throwErrorStatement(functionName);
			}
		},
		VariableDeclaration(path) {
			path.node.declarations.forEach((declaration) => {
				if (!t.isIdentifier(declaration.id)) {
					return;
				}

				const functionName = declaration.id.name;

				if (functionName && removeExports.includes(functionName)) {
					if (
						t.isFunctionExpression(declaration.init) ||
						t.isArrowFunctionExpression(declaration.init)
					) {
						declaration.init.body = throwErrorStatement(functionName);
					} else if (t.isIdentifier(declaration.init)) {
						declaration.init = t.arrowFunctionExpression([], throwErrorStatement(functionName));
					}
				}
			});
		},
	});

	const generated = generate(ast, {
		sourceMaps: true,
		sourceFileName: fileName,
		filename: fileName,
	});

	const result = await babel.transformAsync(generated.code, {
		sourceMaps: true,
		plugins: ["transform-dead-code-elimination"],
		filename: fileName,
		sourceFileName: fileName,
		sourceType: "module",
	});

	const resultCode = result?.code;
	const resultMap = result?.map;
	invariant(resultCode && resultMap, "Failed to transform code after removing exports");

	return {
		code: resultCode,
		map: resultMap,
	}
}
