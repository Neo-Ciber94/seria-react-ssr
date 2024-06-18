import path from "node:path";

const loader = {
	".js": "js",
	".ts": "ts",
	".jsx": "jsx",
	".tsx": "tsx",
} as const;

type Ext = keyof typeof loader;
export type JavascriptLoader = (typeof loader)[Ext];

export function getLoader(filePath: string): JavascriptLoader {
	const ext = path.extname(filePath) as Ext;
	return loader[ext];
}

export function normalizePath(filepath: string) {
	return filepath.replaceAll(path.win32.sep, path.posix.sep);
}
