import React from "react";
import { renderToPipeableStream } from "react-dom/server";
import { EntryServer } from "@/framework/react";
import { AppContext } from "./core/react/server";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { PassThrough } from "stream";
import { matchRoute } from "./$routes";
import path from "path";
import { fileURLToPath } from "url";
import * as seria from "seria";
import { LoaderContext, LoaderFunctionArgs } from "./core/server/loader";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const IS_DEV = process.env.NODE_ENV !== "production";
const CLIENT_DIR = IS_DEV ? "/build/client" : "/client";
const BASE_DIR = path.resolve(__dirname, "..");
const ROOT_DIR = path.relative(process.cwd(), BASE_DIR) || "./";

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

app.get("*", async (ctx) => {
  const request = ctx.req;
  const pathname = ctx.req.path;
  const match = matchRoute(pathname);

  if (match == null) {
    return ctx.notFound();
  }

  const { params = {}, ...route } = match;
  let loaderData: any = undefined;
  const loaderContext = new LoaderContext();

  if (route.loader) {
    const loaderArgs: LoaderFunctionArgs = {
      request: request.raw,
      context: loaderContext,
      params,
    };

    try {
      loaderData = await route.loader(loaderArgs);
      if (loaderData instanceof Response) {
        return loaderData;
      }
    } catch (err) {
      if (err instanceof Response) {
        return err;
      }

      throw err;
    }
  }

  const appContext: AppContext = { loaderData, pathname, url: request.url };
  const responseInit = loaderContext.getResponseInit();
  const response = await createResponse(appContext, responseInit);
  return response;
});

function createResponse(appContext: AppContext, responseInit?: ResponseInit) {
  let didError = false;
  const { json, resumeStream } = seria.stringifyToResumableStream(
    appContext.loaderData || {}
  );

  const isResumable = !!resumeStream;
  return new Promise<Response>((resolve, reject) => {
    const { pipe } = renderToPipeableStream(
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
  });
}

const port = Number(process.env.PORT ?? 5000);
const hostname = process.env.HOST ?? "localhost";

serve({ fetch: app.fetch, hostname, port }, () => {
  console.log(`Listening on http://${hostname}:${port}`);
});
