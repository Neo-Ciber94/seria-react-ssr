import React, { useContext } from "react";
import { createContext, useMemo } from "react";
import { useHasError, usePageError, useUrl } from "../react";
import { matchErrorRoute, matchRoute } from "../../$routes";
import { ErrorPage, NotFoundPage } from "./error";
import { ErrorBoundary } from "../react/error";

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

  const hasError = useHasError();

  return (
    <RouterContext.Provider
      value={{
        params: page.params,
        pathname,
        searchParams,
      }}
    >
      <ErrorBoundary
        fallback={() => {
          const match = matchErrorRoute(pathname);
          const Fallback = match?.component ?? ErrorPage;
          return <Fallback />;
        }}
      >
        {hasError ? <ErrorFallback /> : <page.Component />}
      </ErrorBoundary>
    </RouterContext.Provider>
  );
}

function ErrorFallback() {
  const error = usePageError();
  const pathname = usePathname();
  const ErrorComponent = useMemo(() => {
    const match = matchErrorRoute(pathname);
    return match?.component ?? ErrorPage;
  }, [pathname, error]);

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
