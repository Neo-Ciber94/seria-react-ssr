import React, { useContext } from "react";
import { createContext, useMemo } from "react";
import { useError, useUrl } from "../react";
import { matchErrorRoute, matchRoute } from "../../$routes";
import { ErrorPage, NotFoundPage } from "./error";
import { ErrorBoundary } from "../react/error";
import { HttpError } from "../server/http";

export type Params = Record<string, string | string[] | undefined>;

type RouterContextProps = {
  params: Params;
  pathname: string;
  searchParams: URLSearchParams;
};

const RouterContext = createContext<RouterContextProps>({
  params: {},
  pathname: "",
  searchParams: new URLSearchParams(),
});

export function Router() {
  const { pathname, searchParams } = useUrl();
  const page = useMemo(() => {
    const match = matchRoute(pathname);
    const Component = match?.component ?? NotFoundPage;
    const params = match?.params || {};
    return { Component, params };
  }, [pathname]);

  const appError = useError();
  const error = useMemo(() => {
    return appError
      ? new HttpError(appError.statusCode, appError.message ?? "Internal Error")
      : undefined;
  }, [appError]);

  return (
    <RouterContext.Provider
      value={{
        params: page.params,
        pathname,
        searchParams,
      }}
    >
      <ErrorBoundary error={error} fallback={() => <ErrorFallback />}>
        <page.Component />
      </ErrorBoundary>
    </RouterContext.Provider>
  );
}

function ErrorFallback() {
  const pathname = usePathname();
  const ErrorComponent = useMemo(() => {
    const match = matchErrorRoute(pathname);
    return match?.component ?? ErrorPage;
  }, [pathname]);

  return <ErrorComponent />;
}

export function useParams<T extends Params = Params>() {
  return useContext(RouterContext).params as T;
}

export function useSearchParams() {
  return useContext(RouterContext).searchParams;
}

export function usePathname() {
  return useContext(RouterContext).pathname;
}
