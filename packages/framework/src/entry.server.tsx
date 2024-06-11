import polka from "polka";
import { getOrigin, createRequest, setResponse } from "./core/server/adapters/node/helpers";
import { createRequestHandler } from "./core/server/handleRequest";
import { preloadViteServer } from "./core/server/vite";
import { handle } from "./core/server/adapters/node/handler";

const PORT = process.env.PORT ?? 5000;
const HOST = process.env.HOST ?? "localhost";
const DEV = process.env.NODE_ENV !== "production";

async function start() {
  if (DEV) {
    await startDevServer();
  } else {
    await startServer();
  }
}

async function startServer() {
  const app = polka();
  app.use(handle);
  app.listen(PORT, () => {
    console.log(`Listening on http://${HOST}:${PORT}`);
  });
}

async function startDevServer() {
  const viteServer = await preloadViteServer();
  const app = polka();

  app.use(viteServer.middlewares);
  const handleRequest = createRequestHandler();

  app.use(async (req, res) => {
    try {
      const baseUrl = process.env.ORIGIN ?? getOrigin(req);
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

start().catch(console.error);
