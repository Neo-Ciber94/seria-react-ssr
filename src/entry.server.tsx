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
import * as seria from "seria";

const port = Number(process.env.PORT ?? 5000);
const hostname = process.env.HOST ?? "localhost";
const app = new Hono();

app.use(
  "/dist/client/*",
  serveStatic({
    root: "./",
  })
);

app.use(
  "/public/*",
  serveStatic({
    root: "./",
  })
);

app.get("*", async (ctx) => {
  const request = ctx.req;
  const pathname = ctx.req.path;
  const match = matchRoute(pathname);

  if (match == null) {
    return ctx.notFound();
  }

  const { routePath, params = {} } = match;
  const importPath = path.join("routes", routePath).replaceAll(path.sep, "/");
  const module = await import(`./${importPath}`);

  if (typeof module.default !== "function") {
    console.error(`Not default export component found on: ${importPath}`);
    return ctx.notFound();
  }

  const { loader } = module;
  let loaderData: any = undefined;

  if (loader) {
    if (typeof loader !== "function") {
      console.error("Loader must be a function");
    } else {
      try {
        loaderData = await loader({ params, request });
      } catch (err) {
        if (err instanceof Response) {
          return err;
        }

        throw err;
      }
    }
  }

  const appContext: AppContext = { loaderData, pathname, url: request.url };
  const response = await createResponse(appContext);
  return response;
});

function createResponse(appContext: AppContext) {
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
        bootstrapModules: ["/dist/client/bundle.js"],
        onAllReady() {
          const body = new PassThrough();
          pipe(body);

          const stream = new ReadableStream({
            async start(controller) {
              for await (const chunk of body) {
                controller.enqueue(chunk);
              }

              if (resumeStream) {
                for await (const chunk of resumeStream) {
                  const id = genId();
                  controller.enqueue(
                    `<script data-stream-resume="${id}">$seria_stream_writer.write(${JSON.stringify(chunk)})</script>`
                  );
                }

                const id = genId();
                controller.enqueue(
                  `<script data-stream-resume="${id}">window.$seria_stream_writer.close()</script>`
                );
              }

              controller.close();
            },
          });

          resolve(
            new Response(stream, {
              status: didError ? 500 : 200,
              headers: {
                "content-type": "text/html",
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

function genId() {
  return btoa(crypto.randomUUID()).replaceAll("=", "");
}

serve(
  {
    fetch: app.fetch,
    hostname,
    port,
  },
  () => {
    console.log(`Listening on http://${hostname}:${port}`);
  }
);
