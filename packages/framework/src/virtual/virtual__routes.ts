import { ErrorCatcher, Route, ServerAction } from "../router/routing";
import { MatchedRoute } from "radix3";

export const routes: Route[] = [];

export const errorCatchers: ErrorCatcher[] = [];

export const matchRoute = (id: string): MatchedRoute<Route> => {
  throw new Error("Not implemented");
};

export const matchErrorCatcher = (id: string): MatchedRoute<ErrorCatcher> => {
  throw new Error("Not implemented");
};

export const matchServerAction = (id: string): MatchedRoute<ServerAction> => {
  throw new Error("Not implemented");
};

/*

export const routes: Route[] = []
export const errorCatchers: ErrorCatcher[] = []
export const serverActions: ServerAction[] = []

*/