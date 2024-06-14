import { type Route, createRouter } from "framework/router/routing";
import * as route$0 from "./src/routes/index";

const routes = [
  {
    id: "/index",
    path: "/",
    layouts: [],
    component: route$0.default,
    loader: (route$0 as any).loader,
  },
] satisfies Route[];

const router = createRouter(routes);

export function matchRoute(id: string) {
  return router.match(id);
}

export const matchErrorCatcher = (id: string): any => {
  console.warn("'matchErrorCatcher' is not implemented yet");
  return null;
};

export const matchServerAction = (id: string): any => {
  console.warn("'matchServerAction' is not implemented yet");
  return null;
};

console.log(router.match("/"));
