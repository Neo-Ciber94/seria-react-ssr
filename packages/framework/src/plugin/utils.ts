import path from "node:path";

const loader = {
	".js": "js",
	".ts": "ts",
	".jsx": "jsx",
	".tsx": "tsx",
} as const;

type Ext = keyof typeof loader;
type Loader = (typeof loader)[Ext];

export function getLoader(filePath: string): Loader {
	const ext = path.extname(filePath) as Ext;
	return loader[ext];
}

export function normalizePath(filepath: string) {
	return filepath.replaceAll(path.win32.sep, path.posix.sep);
}
