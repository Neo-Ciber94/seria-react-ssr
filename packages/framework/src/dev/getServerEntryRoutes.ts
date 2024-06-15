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

  // serverEntryRoutes.routes.splice(0, serverEntryRoutes.routes.length);

  // const route = await viteServer.ssrLoadModule(
  //  /* full path? */
  // );
  // serverEntryRoutes.routes.push({
  //   id: "/index",
  //   path: "/",
  //   component: route.default,
  //   ...route,
  // } as any);

  // console.log(serverEntryRoutes.routes);

  return serverEntryRoutes;
}

export function getServerEntryRoutesSync() {
  invariant(
    serverEntryRoutes,
    "'getServerEntryRoutesSync' was called before preloadServerEntryRoutes",
  );
  return serverEntryRoutes;
}
