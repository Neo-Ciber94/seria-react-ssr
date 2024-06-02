import { createRouter } from "radix3";
import IndexPage from "./routes/index";
import TodosPage from "./routes/todos";
import Todos$idPage from "./routes/todos/$id";

const router = createRouter<{ id: string; Component: any }>({
  routes: {
    "/": { id: "/", Component: IndexPage },
    "/todos": { id: "/todos", Component: TodosPage },
    "/todos/:id": { id: "/todos/:id", Component: Todos$idPage },
  },
});

export const matchRoute = (pathname: string) => router.lookup(pathname);
