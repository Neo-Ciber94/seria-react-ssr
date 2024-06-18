import { type MatchedRoute } from "radix3";
import type { Route, ErrorCatcher, ServerAction } from "./router/routing";

// TODO: This module is not suppose to be imported, will be generated a build time

export const routes: Route[] = [];
export const errorCatchers: ErrorCatcher[] = [];
export const actions: ServerAction[] = [];

export const matchRoute = (id: string): MatchedRoute<Route> => {
  throw new Error("Not implemented");
};

export const matchErrorCatcher = (id: string): MatchedRoute<ErrorCatcher> => {
  throw new Error("Not implemented");
};

export const matchServerAction = (id: string): MatchedRoute<ServerAction> => {
  throw new Error("Not implemented");
};

export default function App() {
  throw new Error("Not implemented");
  return null;
}
