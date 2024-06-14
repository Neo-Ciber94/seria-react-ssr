import { invariant } from "../internal";
import { ErrorCatcher, Route } from "../router/routing";
import { getViteServer } from "./vite";

type ServerEntryRoutes = {
  routes: Route[];
  errorCatchers: ErrorCatcher[];
};

let serverEntryRoutes: ServerEntryRoutes | undefined;

export async function preloadServerEntryRoutes() {
  const viteServer = getViteServer();
  const mod = await viteServer.ssrLoadModule("virtual:routes");
  serverEntryRoutes = mod as ServerEntryRoutes;
  return serverEntryRoutes;
}

export function getServerEntryRoutesSync() {
  invariant(
    serverEntryRoutes,
    "'getServerEntryRoutesSync' was called before preloadServerEntryRoutes",
  );
  return serverEntryRoutes;
}
