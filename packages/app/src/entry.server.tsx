import { isDev } from "framework/runtime";
import { createServerEntry, type EntryModule } from "framework/server";
import { createRequestHandler } from "framework/server/adapters/node";
import polka from "polka";
import { createServer as createViteServer } from "vite";

const PORT = process.env.PORT ?? 5000;
const HOST = process.env.HOST ?? "localhost";

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
