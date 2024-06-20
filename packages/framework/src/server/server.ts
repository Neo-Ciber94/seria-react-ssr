import polka from "polka";
import { createRequestHandler } from "./adapters/node";
import { createServerEntry, type EntryModule } from "./serverEntry";
import { createServer as createViteServer } from "vite";
import { isDev } from "../runtime";

const PORT = process.env.PORT ?? 5000;
const HOST = process.env.HOST ?? "localhost";

export async function startServer() {
	const viteServer = isDev
		? await createViteServer({
				appType: "custom",
				server: { middlewareMode: true },
			})
		: undefined;

	const app = polka();

	if (viteServer) {
		app.use(viteServer.middlewares);
	}

	const mod = viteServer
		? await viteServer.ssrLoadModule("virtual:app-entry")
		: await import("virtual:app-entry");

	const serverContext = await createServerEntry(
		mod as EntryModule,
		isDev ? "development" : "production",
	);

	const baseUrl = isDev ? `http://${HOST}:${PORT}` : process.env.ORIGIN;
	const handler = createRequestHandler(serverContext, baseUrl);

	app.use(handler);

	app.listen(PORT, () => {
		console.log(`Listening on http://${HOST}:${PORT}`);
	});
}
