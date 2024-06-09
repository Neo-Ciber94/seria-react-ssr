// import { serve } from "@hono/node-server";
// import { Hono } from "hono";

// import path from "path";
// import { fileURLToPath } from "url";
// import { CLIENT_DIR } from "./core/server/constants";
// import { handleRequest } from "./core/server/handleRequest";
// import { serveStatic } from "@hono/node-server/serve-static";

// const __dirname = path.dirname(fileURLToPath(import.meta.url));
// const BASE_DIR = path.resolve(__dirname, "..");
// const ROOT_DIR = path.relative(process.cwd(), BASE_DIR) || "./";

// const app = new Hono();

// app.use(`${CLIENT_DIR}/*`, serveStatic({ root: ROOT_DIR }));
// app.use(
//   "/*",
//   serveStatic({
//     root: "./",
//     rewriteRequestPath(requestPath) {
//       return path.join("public", requestPath);
//     },
//   }),
// );

// app.all("*", async (ctx) => {
//   const response = await handleRequest(ctx.req.raw);
//   return response;
// });

// const port = Number(process.env.PORT ?? 5000);
// const hostname = process.env.HOST ?? "localhost";

// serve({ fetch: app.fetch, hostname, port }, () => {
//   console.log(`Listening on http://${hostname}:${port}`);
// });

// import express from "express";
// import { handle } from "./core/server/adapters/node";

// const PORT = process.env.PORT ?? 5000;
// const HOST = process.env.HOST ?? "localhost";

// const app = express();
// app.use(handle);

// app.listen(PORT, () => {
//   console.log(`Listening on http://${HOST}:${PORT}`);
// });

import polka from "polka";
import { handle } from "./core/server/adapters/node";

const PORT = process.env.PORT ?? 5000;
const HOST = process.env.HOST ?? "localhost";
const app = polka();

app.use(handle)
app.listen(PORT, () => {
  console.log(`Listening on http://${HOST}:${PORT}`);
});