import type { ViteDevServer, Manifest } from "vite";
import fs from "node:fs/promises";
import { createServer } from "vite";
import { invariant } from "../internal";
import {
	getOrigin,
	createRequest,
	setResponse,
} from "../server/adapters/node/helpers";
import { createRequestHandler } from "../server/handleRequest";

const isDev = process.env.NODE_ENV !== "production";

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
	const handleRequest = createRequestHandler();

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
