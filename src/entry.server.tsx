import polka from "polka";
// import { handle } from "./core/server/adapters/node/handler";

import { getOrigin, createRequest, setResponse } from "./core/server/adapters/node/helpers";
import { createRequestHandler } from "./core/server/handleRequest";
import { preloadViteDevServer } from "./core/server/vite";

const PORT = process.env.PORT ?? 5000;
const HOST = process.env.HOST ?? "localhost";

async function startDevServer() {
  const viteServer = await preloadViteDevServer();
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

startDevServer().catch(console.error);
