import { createRouter } from "radix3";
import $$404Page from "./routes/$$404";
import TodosPage from "./routes/todos";
import Todos$idPage from "./routes/todos/$id";

const router = createRouter<{ id: string; Component: any; routePath: string }>({
  routes: {
    "/**:404": { id: "/**:404", Component: $$404Page, routePath: "$$404.tsx" },
    "/todos": { id: "/todos", Component: TodosPage, routePath: "todos.tsx" },
    "/todos/:id": {
      id: "/todos/:id",
      Component: Todos$idPage,
      routePath: "todos\\$id.tsx",
    },
  },
});

export const matchRoute = (pathname: string) => router.lookup(pathname);
