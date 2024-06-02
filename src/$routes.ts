import { createRouter } from "radix3";
import $$404Page from "./routes/$$404";
import IndexPage, { loader as loader$2 } from "./routes/index";
import TodosPage, { loader as loader$3 } from "./routes/todos";
import Todos$idPage, { loader as loader$4 } from "./routes/todos/$id";

interface Route {
  id: string;
  routePath: string;
  component?: () => any;
  loader?: (...args: any[]) => any | Promise<any>;
}

const router = createRouter<Route>({
  routes: {
    "/**:404": {
      id: "/**:404",
      component: $$404Page,
      routePath: "$$404.tsx",
      loader: undefined,
    },
    "/": {
      id: "/",
      component: IndexPage,
      routePath: "index.tsx",
      loader: loader$2,
    },
    "/todos": {
      id: "/todos",
      component: TodosPage,
      routePath: "todos.tsx",
      loader: loader$3,
    },
    "/todos/:id": {
      id: "/todos/:id",
      component: Todos$idPage,
      routePath: "todos\\$id.tsx",
      loader: loader$4,
    },
  },
});

export const matchRoute = (pathname: string) => router.lookup(pathname);
