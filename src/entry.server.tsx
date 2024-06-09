import polka from "polka";
// import { handle } from "./core/server/adapters/node/handler";
import { createServer as createViteServer } from "vite";
import { getOrigin, createRequest, setResponse } from "./core/server/adapters/node/helpers";
import { createRequestHandler } from "./core/server/handleRequest";

const PORT = process.env.PORT ?? 5000;
const HOST = process.env.HOST ?? "localhost";

async function startDevServer() {
  console.log("Start vite");

  const viteDevServer = await createViteServer({
    server: { middlewareMode: true },
    appType: "custom",
  });

  console.log("Vite started");
  const app = polka();

  app.use(viteDevServer.middlewares);

  const { render } = await viteDevServer.ssrLoadModule("./src/core/server/render.ts");
  const handleRequest = createRequestHandler({ render });

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
