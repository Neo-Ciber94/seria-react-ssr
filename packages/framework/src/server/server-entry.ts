import path from "node:path";
import { existsSync } from "node:fs";
import url from "node:url";
import type { ComponentType } from "react";
import {
	createRouter,
	type ErrorCatcher,
	type Route,
	type Router,
	type ServerAction,
} from "../router/routing";

type Empty = Record<string, never>;

export type ServerEntryContext = {
	router: Router<Route>;
	errorCatcherRouter: Router<ErrorCatcher>;
	serverActionRouter: Router<ServerAction>;
	EntryComponent: ComponentType<Empty>;
};

export async function createDevServerEntryContext(
	routesDir: string,
	routes: Route[],
	errorCatchers: ErrorCatcher[],
	actions: ServerAction[],
): Promise<ServerEntryContext> {
	const rootDir = process.cwd();
	const dir = path.join(rootDir, routesDir);

	if (!existsSync(dir)) {
		throw new Error(`Routes directory was not found: '${dir}'`);
	}

	const entryFilePath = path.join(rootDir, "src", "app"); // no extension
	const entryMod = await import(
		/* @vite-ignore */ url.pathToFileURL(entryFilePath).href
	);

	if (typeof entryMod.default !== "function") {
		throw new Error(`App entry point not found at: '${rootDir}'`);
	}

	const serverRoutes = [...routes];
	const serverCatchers = [...errorCatchers];
	const serverActions = [...actions];

	for (const route of serverRoutes) {
		// We replace the virtual module loaded, with the actual module
		const routeFilePath = path.join(dir, remoteLeadingSlash(route.id));
		route.module = await import(
			/* @vite-ignore */ url.pathToFileURL(routeFilePath).href
		);

		if (route.layouts) {
			for (const layout of route.layouts) {
				const layoutFilePath = path.join(dir, remoteLeadingSlash(layout.id));
				layout.module = await import(
					/* @vite-ignore */ url.pathToFileURL(layoutFilePath).href
				);
			}
		}
	}

	for (const errorCatcher of errorCatchers) {
		// We replace the virtual module loaded, with the actual module
		const routeFilePath = path.join(dir, remoteLeadingSlash(errorCatcher.id));
		errorCatcher.module = await import(
			/* @vite-ignore */ url.pathToFileURL(routeFilePath).href
		);
	}

	for (const action of serverActions) {
		const parts = remoteLeadingSlash(action.id).split("#");
		const fileName = parts[0];
		const name = parts[1];
		const actionFilePath = path.join(dir, remoteLeadingSlash(fileName));
		const actionMod = await import(
			/* @vite-ignore */ url.pathToFileURL(actionFilePath).href
		);
		action.action = actionMod[name];
	}

	return {
		router: createRouter(serverRoutes),
		errorCatcherRouter: createRouter(serverCatchers),
		serverActionRouter: createRouter(serverActions),
		EntryComponent: entryMod.default,
	};
}

function remoteLeadingSlash(filePath: string) {
	if (filePath.startsWith("/")) {
		return filePath.slice(1);
	}

	return filePath;
}
