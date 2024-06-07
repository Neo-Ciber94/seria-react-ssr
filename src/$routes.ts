import { createRouter } from "radix3";
import IndexPage, { loader as loader$0 } from "./routes/index";
import TodosPage, { loader as loader$1 } from "./routes/todos";
import Todos$idPage, { loader as loader$2 } from "./routes/todos/$id";

import { add as action$0 } from "./routes/_actions";
import { mul as action$1 } from "./routes/_actions";

interface Route {
  id: string;
  routePath: string;
  component?: () => any;
  loader?: (...args: any[]) => any | Promise<any>;
}

interface ErrorRoute {
  id: string;
  routePath: string;
  component: () => any;
}

interface Action {
  id: string;
  actionPath: string;
  functionName: string;
  action: (...args: any[]) => Promise<any>;
}

const router = createRouter<Route>({
  routes: {
    "/": {
      id: "/",
      component: IndexPage,
      routePath: "index.tsx",
      loader: loader$0,
    },
    "/todos": {
      id: "/todos",
      component: TodosPage,
      routePath: "todos.tsx",
      loader: loader$1,
    },
    "/todos/:id": {
      id: "/todos/:id",
      component: Todos$idPage,
      routePath: "todos\\$id.tsx",
      loader: loader$2,
    },
  },
});

const errorRouter = createRouter<ErrorRoute>({ routes: {} });

const actionRouter = createRouter<Action>({
  routes: {
    "_actions#add": {
      id: "_actions#add",
      actionPath: "_actions.ts",
      action: action$0,
    },
    "_actions#mul": {
      id: "_actions#mul",
      actionPath: "_actions.ts",
      action: action$1,
    },
  },
});

export const matchRoute = (pathname: string) => router.lookup(pathname);

export const matchErrorRoute = (pathname: string) =>
  errorRouter.lookup(pathname);

export const matchAction = (id: string) => actionRouter.lookup(id);
