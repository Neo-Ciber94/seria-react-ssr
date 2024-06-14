import { ErrorCatcher, Route } from "../router/routing";

export const routes: Route[] = [];

export const errorCatchers: ErrorCatcher[] = [];

export const matchRoute = (id: string): any => {
  throw new Error("Not implemented");
};

export const matchErrorCatcher = (id: string): any => {
  throw new Error("Not implemented");
};

export const matchServerAction = (id: string): any => {
  throw new Error("Not implemented");
};
