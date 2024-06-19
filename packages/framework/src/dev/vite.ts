import fs from "node:fs/promises";
import type { Manifest, ViteDevServer } from "vite";
import { createServer } from "vite";
import { invariant } from "../internal";
import {
	createRequest,
	getOrigin,
	setResponse,
} from "../server/adapters/node/helpers";
import { createRequestHandler } from "../server/handleRequest";
import { createDevServerEntryContext } from "../server/server-entry";
import { isDev } from "../runtime";

export type AppEntryModule = typeof import("../app-entry");

export async function getViteManifest() {
	const manifestPath = "./build/client/.vite/manifest.json";
	const data = isDev
		? await fs.readFile(manifestPath, "utf-8")
		: await fs.readFile(manifestPath, "utf-8");

	return JSON.parse(data) as Manifest;
}

let viteServer: ViteDevServer | undefined;

export async function preloadViteServer() {
	viteServer = await createServer({
		server: { middlewareMode: true },
		appType: "custom",
	});

	return viteServer;
}

export function getViteServer() {
	invariant(
		viteServer,
		"'preloadViteDevServer' should be called before 'getViteServer'",
	);
	return viteServer;
}

export async function startViteServer(server: ViteDevServer) {
	viteServer = server;

	const mod = (await viteServer.ssrLoadModule(
		"virtual:app-entry",
	)) as AppEntryModule;

	const serverContext = await createDevServerEntryContext(
		mod.routesDir,
		mod.routes,
		mod.errorCatchers,
		mod.actions,
	);

	const handleRequest = createRequestHandler(serverContext);

	server.middlewares.use(async (req, res, next) => {
		try {
			const baseUrl = process.env.ORIGIN ?? getOrigin(req);
			const request = await createRequest({ req, baseUrl });
			const response = await handleRequest(request);
			setResponse(response, res);
		} catch (err) {
			next(err);
		}
	});
}
