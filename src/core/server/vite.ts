import { ViteDevServer, type Manifest } from "vite";
import fs from "fs/promises";
import { createServer } from "vite";
import { invariant } from "../internal";
import polka from "polka";
import { getOrigin, createRequest, setResponse } from "./adapters/node/helpers";
import { createRequestHandler } from "./handleRequest";

const isDev = process.env.NODE_ENV !== "production";

export async function getViteManifest() {
  const manifestPath = "./build/client/.vite/manifest.json";
  const data = isDev
    ? await fs.readFile(manifestPath, "utf-8")
    : await fs.readFile(manifestPath, "utf-8");

  return JSON.parse(data) as Manifest;
}

let viteServer: ViteDevServer | undefined;

export async function preloadViteServer() {
  viteServer = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
  });

  return viteServer;
}

export function getViteServer() {
  invariant(viteServer, "'preloadViteDevServer' should be called before 'getViteServer'");
  return viteServer;
}

export async function startViteServer(server: ViteDevServer) {
  // const app = polka();

  // app.use(server.middlewares);
  const handleRequest = createRequestHandler();

  server.middlewares.use(async (req, res) => {
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

  // app.listen(port, () => {
  //   console.log(`Listening on ${origin}:${port}`);
  // });
}
