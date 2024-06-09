import React from "react";
import { renderToPipeableStream } from "react-dom/server";
import { EntryServer } from "@/framework/react";
import { AppContext } from "./core/react";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { PassThrough } from "stream";
import { matchAction, matchRoute, Route } from "./$routes";
import path from "path";
import { fileURLToPath } from "url";
import * as seria from "seria";
import { LoaderFunctionArgs } from "./core/server/loader";
import {
  HEADER_LOADER_DATA,
  HEADER_ROUTE_ERROR,
  HEADER_ROUTE_REDIRECT,
  HEADER_SERIA_STREAM,
  HEADER_SERVER_ACTION,
  SERVER_ACTION_ROUTE,
} from "./core/constants";
import { HttpError, TypedJson } from "./core/server/http";
import { decode } from "seria/form-data";
import { untilAll } from "./core/internal";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const IS_DEV = process.env.NODE_ENV !== "production";
const CLIENT_DIR = IS_DEV ? "/build/client" : "/client";
const BASE_DIR = path.resolve(__dirname, "..");
const ROOT_DIR = path.relative(process.cwd(), BASE_DIR) || "./";
const ABORT_DELAY = 10_000;

const app = new Hono();

app.use(`${CLIENT_DIR}/*`, serveStatic({ root: ROOT_DIR }));
app.use(
  "/*",
  serveStatic({
    root: "./",
    rewriteRequestPath(requestPath) {
      return path.join("public", requestPath);
    },
  })
);

app.post("/_action", async (ctx) => {
  const actionId = ctx.req.header(HEADER_SERVER_ACTION) ?? "";
  const match = matchAction(actionId);

  if (!match) {
    return ctx.notFound();
  }

  const formData = await ctx.req.formData();

  try {
    const args = decode(formData) as any[];
    const result = await match.action(...args);
    const stream = seria.stringifyToStream(result);
    return ctx.newResponse(stream, {
      status: 200,
      headers: {
        "content-type": "application/json+seria",
        "cache-control": "no-cache",
      },
    });
  } catch (err) {
    console.error(err);
    return ctx.newResponse(null, 500);
  }
});

app.get("*", async (ctx) => {
  const request = ctx.req.raw;
  const pathname = ctx.req.path;
  const url = ctx.req.url;
  const match = matchRoute(pathname);

  if (ctx.req.header(HEADER_LOADER_DATA)) {
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
    const routeData = await getRouteData({ route, params, request });

    for (const [id, loaderData] of Object.entries(routeData)) {
      if (loaderData instanceof TypedJson) {
        routeData[id] = loaderData.data;
        responseInit = {
          ...responseInit,
          ...loaderData.init,
          headers: {
            ...responseInit.headers,
            ...loaderData.init?.headers,
          },
        };
      } else if (loaderData instanceof HttpError) {
        return renderErrorPage({
          url,
          message: routeData.message,
          status: routeData.status,
        });
      } else if (routeData instanceof Response) {
        if (routeData.status >= 400) {
          const message = await getResponseErrorMessage(routeData);
          return renderErrorPage({
            url,
            message,
            status: routeData.status,
          });
        }

        return loaderData;
      }
    }

    const appContext: AppContext = { loaderData: routeData, url };
    const response = await renderPage(appContext, responseInit);
    return response;
  } catch (err) {
    console.error("Failed to create page response", err);
    return renderErrorPage({ url, status: 500 });
  }
});

type GetLoaderDataArgs = {
  loader: any;
  params: Record<string, string>;
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
    const routeData = await getRouteData({ route, params, request });

    for (const [id, loaderData] of Object.entries(routeData)) {
      if (loaderData instanceof TypedJson) {
        routeData[id] = loaderData.data;
        responseInit = {
          ...responseInit,
          ...loaderData.init,
          headers: {
            ...responseInit.headers,
            ...loaderData.init?.headers,
          },
        };
      } else if (loaderData instanceof HttpError) {
        return new Response(loaderData.message, {
          status: loaderData.status,
          headers: {
            [HEADER_ROUTE_ERROR]: "1",
            "content-type": "text/plain",
          },
        });
      } else if (routeData instanceof Response) {
        if (loaderData.status >= 400) {
          const message = await getResponseErrorMessage(loaderData);
          return new Response(message, {
            status: loaderData.status,
            headers: {
              [HEADER_ROUTE_ERROR]: "1",
              "content-type": "text/plain",
            },
          });
        }

        if (
          loaderData.status >= 300 &&
          loaderData.status < 400 &&
          loaderData.headers.has(HEADER_ROUTE_REDIRECT)
        ) {
          // We strip the `Location` header, we don't need it when the client request loader data
          const to = loaderData.headers.get(HEADER_ROUTE_REDIRECT)!;
          return new Response(null, {
            status: loaderData.status,
            headers: {
              [HEADER_ROUTE_REDIRECT]: to,
            },
          });
        }

        return loaderData;
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
    }
  } catch (err) {
    console.error(err);
    return new Response(null, {
      status: 500,
    });
  }
}

function renderPage(appContext: AppContext, responseInit?: ResponseInit) {
  let didError = false;
  const { json, resumeStream } = seria.stringifyToResumableStream(
    appContext.loaderData || {}
  );

  const isResumable = !!resumeStream;
  return new Promise<Response>((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      <EntryServer
        appContext={appContext}
        json={json}
        isResumable={isResumable}
      />,
      {
        bootstrapModules: [`${CLIENT_DIR}/bundle.js`],
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
                    </script>`
                  );
                }

                const id = nextId();
                controller.enqueue(
                  `<script data-seria-stream-resume="${id}">
                    window.$seria_stream_writer.close();
                    document.querySelector('[data-seria-stream-resume="${id}"]').remove();
                  </script>`
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
            })
          );
        },
        onShellError(err) {
          reject(err);
        },
        onError(error) {
          didError = true;
          console.error(error);
        },
      }
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

const port = Number(process.env.PORT ?? 5000);
const hostname = process.env.HOST ?? "localhost";

serve({ fetch: app.fetch, hostname, port }, () => {
  console.log(`Listening on http://${hostname}:${port}`);
});
