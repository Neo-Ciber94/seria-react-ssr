import { createRouter } from "radix3";
import IndexPage, { loader as loader$1 } from "./routes/index";
import TodosPage, { loader as loader$2 } from "./routes/todos";
import Todos$idPage, { loader as loader$3 } from "./routes/todos/$id";
import $errorPage from "./routes/_error";

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

const router = createRouter<Route>({
  routes: {
    "/": {
      id: "/",
      component: IndexPage,
      routePath: "index.tsx",
      loader: loader$1,
    },
    "/todos": {
      id: "/todos",
      component: TodosPage,
      routePath: "todos.tsx",
      loader: loader$2,
    },
    "/todos/:id": {
      id: "/todos/:id",
      component: Todos$idPage,
      routePath: "todos\\$id.tsx",
      loader: loader$3,
    },
  },
});

const errorRouter = createRouter<ErrorRoute>({
  routes: {
    "/**": {
      id: "/**",
      component: $errorPage,
      routePath: "_error.tsx",
    },
  },
});

export const matchRoute = (pathname: string) => router.lookup(pathname);

export const matchErrorRoute = (pathname: string) =>
  errorRouter.lookup(pathname);
