
import babelGenerate from "@babel/generator";
import babelTraverse from "@babel/traverse";

// @ts-ignore
export const traverse = typeof babelTraverse === 'function' ? babelTraverse : babelTraverse.default as typeof babelTraverse;

// @ts-ignore
export const generate = typeof babelGenerate === 'function' ? babelGenerate : babelGenerate.default as typeof babelGenerate;