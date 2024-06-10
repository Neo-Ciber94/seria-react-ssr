import { ViteDevServer, type Manifest } from "vite";
import fs from "fs/promises";
import { createServer } from "vite";
import { invariant } from "../internal";

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

export async function setViteServer(server: ViteDevServer) {
  viteServer = server;
}

export function getViteServer() {
  invariant(viteServer, "'preloadViteDevServer' should be called before 'getViteServer'");
  return viteServer;
}
