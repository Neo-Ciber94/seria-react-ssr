import fs from "node:fs";
import path from "node:path";
import type { Manifest } from "vite";

let manifest: Manifest | undefined;

export function getViteManifest() {
	if (manifest) {
		return manifest;
	}

	const manifestPath = path.join(process.cwd(), "build/client/.vite/manifest.json");
	const contents = fs.readFileSync(manifestPath, "utf8");
	manifest = JSON.parse(contents) as Manifest;
	return manifest;
}

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
