import {
  type Route,
  type ErrorCatcher,
  createRouter,
} from "framework/router/routing";
import * as route$0 from "./src/routes/index";
import * as route$1 from "./src/routes/$dynamic";

export const routes = [
  {
    id: "/index",
    path: "/",
    layouts: [],
    component: route$0.default,
    loader: (route$0 as any).loader,
  },
  {
    id: "/$dynamic",
    path: "/:dynamic",
    layouts: [],
    component: route$1.default,
    loader: (route$1 as any).loader,
  },
] satisfies Route[];

export const errorCatchers: ErrorCatcher[] = [];

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
