import React, { createContext, PropsWithChildren, useContext, useMemo } from "react";
import { createErrorRouter, createRouter, ErrorCatcher, Route, Router } from "../router/routing";

export type AppContext = {
  loaderData: Record<string, any>;
  url: string;
  error?: {
    status: number;
    message?: string;
  };
};

declare global {
  var APP_CONTEXT: AppContext;
}

type ServerContextProps = {
  appContext: AppContext;
  router: Router<Route>;
  errorRouter: Router<ErrorCatcher>;
};

const ServerContext = createContext<ServerContextProps | null>(null);

type ServerContextProviderProps = PropsWithChildren<{
  appContext: AppContext;
  routes: Route[];
  errorCatchers: ErrorCatcher[];
}>;

export function ServerContextProvider(props: ServerContextProviderProps) {
  const { appContext, errorCatchers, routes, children } = props;
  const router = useMemo(() => createRouter(routes), [routes]);
  const errorRouter = useMemo(() => createErrorRouter(errorCatchers), [errorCatchers]);

  return (
    <ServerContext.Provider
      value={{
        appContext,
        router,
        errorRouter,
      }}
    >
      {children}
    </ServerContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(ServerContext);

  if (!ctx) {
    throw new Error("'ServerContext' was not available");
  }

  return ctx;
}
