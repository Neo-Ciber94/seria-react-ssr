import polka from "polka";
import { getOrigin, createRequest, setResponse } from "./adapters/node/helpers";
import { createRequestHandler } from "./handleRequest";
import { preloadViteServer } from "./vite";
import { handle } from "./adapters/node/handler";

const PORT = process.env.PORT ?? 5000;
const HOST = process.env.HOST ?? "localhost";
const DEV = process.env.NODE_ENV !== "production";

async function startProductionServer() {
  const app = polka();
  app.use(handle);
  app.listen(PORT, () => {
    console.log(`Listening on http://${HOST}:${PORT}`);
  });
}

async function startDevelopmentServer() {
  const viteServer = await preloadViteServer();
  const app = polka();

  app.use(viteServer.middlewares);
  const handleRequest = createRequestHandler();

  console.log("RUNNING VITE SERVER")

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

export async function startServer() {
  if (DEV) {
    await startDevelopmentServer();
  } else {
    await startProductionServer();
  }
}
