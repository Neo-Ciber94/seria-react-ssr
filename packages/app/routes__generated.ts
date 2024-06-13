import { type Route, createRouter } from "framework/router/routing";
import * as route$0 from "./src/routes/index.tsx";
import * as route$1 from "./src/routes/todos/$id.tsx";

const routes = [
  {
    id: "/index",
    routePath: "/",
    layouts: [],
    component: route$0.default,
    loader: (route$0 as any).loader,
  },
  {
    id: "/todos/$id",
    routePath: "/todos/:id",
    layouts: [],
    component: route$1.default,
    loader: (route$1 as any).loader,
  },
] satisfies Route[];

const router = createRouter(routes);

export function matchRoute(id: string) {
  return router.match(id);
}
