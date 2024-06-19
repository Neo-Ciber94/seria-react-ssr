import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";
import * as seria from "seria";
import { decode } from "seria/form-data";
import {
	HEADER_LOADER_DATA,
	HEADER_ROUTE_ERROR,
	HEADER_ROUTE_REDIRECT,
	HEADER_SERIA_STREAM,
	HEADER_SERVER_ACTION,
} from "../constants";
import { getViteManifest } from "../dev/utils";
import { getViteServer } from "../dev/vite";
import { untilAll } from "../internal";
import { type AppContext, EntryServer } from "../react";
import type { EntryServerContext } from "../react/server";
import type { Params } from "../router";
import type { Route } from "../router/routing";
import { HttpError, TypedJson } from "./http";
import type { LoaderFunctionArgs } from "./loader";
import type { ServerEntryContext } from "./server-entry";
import { isDev } from "../runtime";

const ABORT_DELAY = 10_000;

type GetLoaderDataArgs = {
	loader: (...args: any[]) => any;
	params: Params;
	request: Request;
};

async function getLoaderData(args: GetLoaderDataArgs) {
	const { loader, params, request } = args;

	if (loader) {
		const loaderArgs: LoaderFunctionArgs = {
			request,
			params,
		};

		try {
			const data = await loader(loaderArgs);

			if (data instanceof Response) {
				return data;
			}

			return data;
		} catch (err) {
			if (err instanceof HttpError) {
				return err;
			}

			throw err;
		}
	}

	return undefined;
}

type CreateLoaderResponseArgs = {
	route: Route;
	params: Record<string, string>;
	request: Request;
};

async function createLoaderResponse(args: CreateLoaderResponseArgs) {
	const { route, params = {}, request } = args;
	const url = request.url;

	try {
		let responseInit: ResponseInit = {};
		const loaderData = await getRouteData({ route, params, request });

		for (const [id, data] of Object.entries(loaderData)) {
			if (data instanceof TypedJson) {
				loaderData[id] = data.data;
				responseInit = {
					...responseInit,
					...data.init,
					headers: {
						...responseInit.headers,
						...data.init?.headers,
					},
				};
			} else if (data instanceof HttpError) {
				return new Response(data.message, {
					status: data.status,
					headers: {
						[HEADER_ROUTE_ERROR]: "1",
						"content-type": "text/plain",
					},
				});
			} else if (data instanceof Response) {
				if (data.status >= 400) {
					const message = await getResponseErrorMessage(data);
					return new Response(message, {
						status: data.status,
						headers: {
							[HEADER_ROUTE_ERROR]: "1",
							"content-type": "text/plain",
						},
					});
				}

				if (
					data.status >= 300 &&
					data.status < 400 &&
					data.headers.has(HEADER_ROUTE_REDIRECT)
				) {
					// We strip the `Location` header, we don't need it when the client request loader data
					// biome-ignore lint/style/noNonNullAssertion: We already check it have the header
					const location = data.headers.get(HEADER_ROUTE_REDIRECT)!;
					return new Response(null, {
						status: data.status,
						headers: {
							[HEADER_ROUTE_REDIRECT]: location,
						},
					});
				}

				return data;
			}
		}

		const appContext: AppContext = { loaderData, url };
		const stream = seria.stringifyToStream(appContext);

		return new Response(stream, {
			...responseInit,
			headers: {
				...responseInit.headers,
				"content-type": "application/json; charset=utf-8",
				[HEADER_SERIA_STREAM]: "1",
			},
		});
	} catch (err) {
		console.error(err);
		return new Response(null, {
			status: 500,
		});
	}
}

const encoder = new TextEncoder();

async function renderPage(
	appContext: AppContext,
	serverContext: ServerEntryContext,
	responseInit?: ResponseInit,
) {
	let statusCode = appContext.error?.status || 200;

	const { json, resumeStream } = seria.stringifyToResumableStream(
		appContext.loaderData || {},
	);
	const isResumable = !!resumeStream;
	const viteServer = isDev ? getViteServer() : undefined;
	const manifest = isDev ? undefined : getViteManifest();
	const entryModule = await viteServer?.ssrLoadModule("virtual:app");
	const context: EntryServerContext = {
		routes: serverContext.router.entries,
		errorCatchers: serverContext.errorCatcherRouter.entries,
		manifest,
		Component: entryModule?.default,
	};

	return new Promise<Response>((resolve, reject) => {
		const { pipe, abort } = renderToPipeableStream(
			<EntryServer
				appContext={appContext}
				json={json}
				isResumable={isResumable}
				serverContext={context}
			/>,
			{
				onAllReady() {
					const body = new PassThrough();
					pipe(body);

					let index = 0;
					const nextId = () => ++index;

					const stream = new ReadableStream({
						async start(controller) {
							for await (const chunk of body) {
								controller.enqueue(chunk);
							}

							if (resumeStream) {
								const reader = resumeStream.getReader();
								while (true) {
									const { done, value: chunk } = await reader.read();

									if (done) {
										break;
									}

									const id = nextId();
									controller.enqueue(
										encoder.encode(`<script data-seria-stream-resume="${id}">
                        $seria_stream_writer.write(${JSON.stringify(chunk)});
                        document.querySelector('[data-seria-stream-resume="${id}"]').remove();
                      </script>`),
									);
								}

								const id = nextId();
								controller.enqueue(
									encoder.encode(`<script data-seria-stream-resume="${id}">
                      window.$seria_stream_writer.close();
                      document.querySelector('[data-seria-stream-resume="${id}"]').remove();
                    </script>`),
								);
							}

							controller.close();
						},
					});

					resolve(
						new Response(stream, {
							...responseInit,
							status: statusCode,
							headers: {
								...responseInit?.headers,
								"content-type": "text/html",
								...(isResumable ? { "cache-control": "no-cache" } : {}),
							},
						}),
					);
				},
				onShellError(error) {
					reject(error);
				},
				onError(error, info) {
					if (viteServer && error instanceof Error) {
						viteServer.ssrFixStacktrace(error);
					}

					statusCode = 500;
					console.error(error, info);
				},
			},
		);

		setTimeout(abort, ABORT_DELAY);
	});
}

function getResponseErrorMessage(response: Response) {
	if (response.headers.get("content-type") === "text/plain") {
		return response.text();
	}

	return undefined;
}

type GetRouteDataArgs = {
	route: Route;
	params: Params;
	request: Request;
};

async function getRouteData(args: GetRouteDataArgs) {
	const { route, params, request } = args;
	const routeData: Record<string, any> = {};
	const promises: Record<string, Promise<any>> = {};

	promises[route.id] = (() => {
		if (!route.module.loader) {
			return Promise.resolve();
		}

		return getLoaderData({
			loader: route.module.loader,
			request,
			params,
		});
	})();

	for (const layout of route.layouts || []) {
		if (!layout.module.loader) {
			continue;
		}

		promises[layout.id] = getLoaderData({
			loader: layout.module.loader,
			request,
			params,
		});
	}

	const result = await untilAll(promises);

	for (const [id, ret] of Object.entries(result)) {
		routeData[id] = ret.state === "resolved" ? ret.data : ret.error;
	}

	return routeData;
}

async function handleAction(
	request: Request,
	serverContext: ServerEntryContext,
) {
	const actionId = request.headers.get(HEADER_SERVER_ACTION) ?? "";
	const match = serverContext.serverActionRouter.match(actionId);

	if (!match) {
		return new Response(null, {
			status: 404,
		});
	}

	const formData = await request.formData();

	try {
		const args = decode(formData) as any[];
		const result = await match.action(...args);
		const stream = seria
			.stringifyToStream(result)
			.pipeThrough(new TextEncoderStream());
		const res = new Response(stream, {
			status: 200,
			headers: {
				"content-type": "application/json+stream",
				"cache-control": "no-cache",
			},
		});

		return res;
	} catch (err) {
		console.error(err);
		return new Response(null, {
			status: 500,
		});
	}
}

async function handlePageRequest(
	request: Request,
	serverContext: ServerEntryContext,
) {
	const { pathname } = new URL(request.url);
	const url = request.url;
	const match = serverContext.router.match(pathname);

	if (request.headers.has(HEADER_LOADER_DATA)) {
		if (match == null) {
			return new Response(null, {
				status: 404,
			});
		}

		const { params = {}, ...route } = match;
		const routeData = await createLoaderResponse({ route, params, request });
		return routeData;
	}

	function renderError(status: number, message?: string) {
		return renderPage(
			{ url, loaderData: {}, error: { status, message } },
			serverContext,
		);
	}

	if (match == null) {
		return renderError(404);
	}

	const { params = {}, ...route } = match;

	try {
		let responseInit: ResponseInit = {};
		const loaderData = await getRouteData({ route, params, request });

		for (const [id, data] of Object.entries(loaderData)) {
			if (data instanceof TypedJson) {
				loaderData[id] = data.data;
				responseInit = {
					...responseInit,
					...data.init,
					headers: {
						...responseInit.headers,
						...data.init?.headers,
					},
				};
			} else if (data instanceof HttpError) {
				return renderError(data.status, data.message);
			} else if (data instanceof Response) {
				if (data.status >= 400) {
					const message = await getResponseErrorMessage(data);
					return renderError(data.status, message);
				}

				return data;
			}
		}

		const appContext: AppContext = { loaderData, url };
		const response = await renderPage(appContext, serverContext, responseInit);
		return response;
	} catch (err) {
		console.error("Failed to create page response", err);
		return renderError(500);
	}
}

export function createRequestHandler(context: ServerEntryContext) {
	return async (request: Request): Promise<Response> => {
		const { pathname } = new URL(request.url);

		if (pathname.startsWith("/_action") && request.method === "POST") {
			return handleAction(request, context);
		}

		if (request.method === "GET") {
			return handlePageRequest(request, context);
		}

		return new Response(null, {
			status: 404,
		});
	};
}
