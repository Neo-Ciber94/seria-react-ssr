import polka from "polka";
import { type AppEntryModule, preloadViteServer } from "../dev/vite";
import { createRequest, getOrigin, setResponse } from "./adapters/node/helpers";
import { createHandler } from "./adapters/node/handler";
import { createRequestHandler } from "./handleRequest";
import {
	type ServerEntryContext,
	createDevServerEntryContext,
} from "./server-entry";
import { createRouter } from "../router/routing";

const PORT = process.env.PORT ?? 5000;
const HOST = process.env.HOST ?? "localhost";
const DEV = process.env.NODE_ENV !== "production";

async function startProductionServer() {
	/* @ts-ignore */
	const mod: AppEntryModule = await import("virtual:app-entry");
	const serverContext: ServerEntryContext = {
		router: createRouter(mod.routes),
		errorCatcherRouter: createRouter(mod.errorCatchers),
		serverActionRouter: createRouter(mod.actions),
		EntryComponent: mod.default,
	};

	const app = polka();
	const handler = createHandler(serverContext);

	app.use(handler);
	app.listen(PORT, () => {
		console.log(`Listening on http://${HOST}:${PORT}`);
	});
}

async function startDevelopmentServer() {
	const viteServer = await preloadViteServer();

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
	const app = polka();

	app.use(viteServer.middlewares);

	console.log("RUNNING VITE SERVER");

	app.use(async (req, res) => {
		try {
			const devOrigin = DEV ? `http://${HOST}:${PORT}` : undefined;
			const baseUrl = process.env.ORIGIN ?? devOrigin ?? getOrigin(req);
			const request = await createRequest({ req, baseUrl });
			const response = await handleRequest(request);
			setResponse(response, res);
		} catch (err) {
			console.error(err);
			res.statusCode = 500;
			res.end();
		}
	});

	app.listen(PORT, () => {
		console.log(`Listening on http://${HOST}:${PORT}`);
	});
}

export async function startServer() {
	if (DEV) {
		await startDevelopmentServer();
	} else {
		await startProductionServer();
	}
}
