import React from "react";
import { renderToPipeableStream } from "react-dom/server";
import { PassThrough } from "stream";
import { matchRoute, Route } from "../../$routes";
import {
  HEADER_LOADER_DATA,
  HEADER_ROUTE_ERROR,
  HEADER_ROUTE_REDIRECT,
  HEADER_SERIA_STREAM,
} from "../constants";
import { untilAll } from "../internal";
import { AppContext, EntryServer } from "../react";
import { HttpError, TypedJson } from "./http";
import { LoaderFunctionArgs } from "./loader";
import * as seria from "seria";
import { handleAction } from "./handleAction";

type GetLoaderDataArgs = {
  loader: any;
  params: Record<string, string>;
  request: Request;
};

const ABORT_DELAY = 10_000;

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

        if (data.status >= 300 && data.status < 400 && data.headers.has(HEADER_ROUTE_REDIRECT)) {
          // We strip the `Location` header, we don't need it when the client request loader data
          const to = data.headers.get(HEADER_ROUTE_REDIRECT)!;
          return new Response(null, {
            status: data.status,
            headers: {
              [HEADER_ROUTE_REDIRECT]: to,
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

function renderPage(appContext: AppContext, responseInit?: ResponseInit) {
  let didError = false;
  const { json, resumeStream } = seria.stringifyToResumableStream(appContext.loaderData || {});

  const isResumable = !!resumeStream;
  return new Promise<Response>((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      <EntryServer appContext={appContext} json={json} isResumable={isResumable} />,
      {
        bootstrapModules: ["/bundle.js"],
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
                for await (const chunk of resumeStream) {
                  const id = nextId();
                  controller.enqueue(
                    `<script data-seria-stream-resume="${id}">
                        $seria_stream_writer.write(${JSON.stringify(chunk)});
                        document.querySelector('[data-seria-stream-resume="${id}"]').remove();
                      </script>`,
                  );
                }

                const id = nextId();
                controller.enqueue(
                  `<script data-seria-stream-resume="${id}">
                      window.$seria_stream_writer.close();
                      document.querySelector('[data-seria-stream-resume="${id}"]').remove();
                    </script>`,
                );
              }

              controller.close();
            },
          });

          resolve(
            new Response(stream, {
              ...responseInit,
              status: didError ? 500 : 200,
              headers: {
                ...responseInit?.headers,
                "content-type": "text/html",
                ...(isResumable ? { "cache-control": "no-cache" } : {}),
              },
            }),
          );
        },
        onShellError(err) {
          reject(err);
        },
        onError(error) {
          didError = true;
          console.error(error);
        },
      },
    );

    setTimeout(abort, ABORT_DELAY);
  });
}

type CreateErrorPageArgs = {
  status: number;
  message?: string;
  url: string;
};

function renderErrorPage(args: CreateErrorPageArgs) {
  const { url, status, message } = args;
  const appContext: AppContext = {
    loaderData: {},
    url,
    error: {
      status,
      message,
    },
  };

  return renderPage(appContext, { status });
}

function getResponseErrorMessage(response: Response) {
  if (response.headers.get("content-type") === "text/plain") {
    return response.text();
  }

  return undefined;
}

type GetRouteDataArgs = {
  route: Route;
  params: Record<string, string>;
  request: Request;
};

async function getRouteData(args: GetRouteDataArgs) {
  const { route, params, request } = args;
  const routeData: Record<string, any> = {};
  const promises: Record<string, Promise<any>> = {};

  promises[route.routePath] = getLoaderData({
    loader: route.loader,
    request,
    params,
  });

  for (const layout of route.layouts || []) {
    promises[layout.layoutPath] = getLoaderData({
      loader: layout.loader,
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

async function handlePageRequest(request: Request) {
  const { pathname } = new URL(request.url);
  const url = request.url;
  const match = matchRoute(pathname);

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

  if (match == null) {
    return renderErrorPage({ url, status: 404 });
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
        return renderErrorPage({
          url,
          message: data.message,
          status: data.status,
        });
      } else if (data instanceof Response) {
        if (data.status >= 400) {
          const message = await getResponseErrorMessage(data);
          return renderErrorPage({
            url,
            message,
            status: data.status,
          });
        }

        return data;
      }
    }

    const appContext: AppContext = { loaderData, url };
    const response = await renderPage(appContext, responseInit);
    return response;
  } catch (err) {
    console.error("Failed to create page response", err);
    return renderErrorPage({ url, status: 500 });
  }
}

export async function handleRequest(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url);

  if (pathname.startsWith("/_action") && request.method === "POST") {
    return handleAction(request);
  }

  if (request.method === "GET") {
    return handlePageRequest(request);
  }

  return new Response(null, {
    status: 404,
  });
}
