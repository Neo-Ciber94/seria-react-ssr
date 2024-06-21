import fs from "node:fs/promises";
import type { Manifest, ViteDevServer } from "vite";
import { createServer } from "vite";
import { invariant } from "../internal";
import { isDev } from "../runtime";

export async function getViteManifest() {
	const manifestPath = "./build/client/.vite/manifest.json";
	const data = isDev
		? await fs.readFile(manifestPath, "utf-8")
		: await fs.readFile(manifestPath, "utf-8");

	return JSON.parse(data) as Manifest;
}

let viteServer: ViteDevServer | undefined;

export async function preloadViteServer() {
	if (viteServer) {
		return viteServer;
	}

	viteServer = await createServer({
		server: { middlewareMode: true },
		appType: "custom",
	});

	return viteServer;
}

export function getViteServer() {
	invariant(viteServer, "'preloadViteDevServer' should be called before 'getViteServer'");
	return viteServer;
}
