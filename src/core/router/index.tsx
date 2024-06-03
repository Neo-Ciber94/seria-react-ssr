import React, { useContext } from "react";
import { createContext, useMemo } from "react";
import { useHasError, usePageError, useUrl } from "../react/server";
import { matchErrorRoute, matchRoute } from "../../$routes";
import { ErrorPage, NotFoundPage } from "./error";

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
  const { Component, params } = useMemo(() => {
    const match = matchRoute(pathname);
    const Component = match?.component ?? NotFoundPage;
    const params = match?.params || {};
    return { Component, params };
  }, [pathname]);

  const hasError = useHasError();

  return (
    <RouterContext.Provider value={{ params, pathname, searchParams }}>
      {hasError ? <CatchError /> : <Component />}
    </RouterContext.Provider>
  );
}

function CatchError() {
  const error = usePageError();
  const pathname = usePathname();
  const { ErrorComponent } = useMemo(() => {
    const match = matchErrorRoute(pathname);
    const ErrorComponent = match?.component ?? ErrorPage;
    return { ErrorComponent };
  }, [pathname, error]);

  return <ErrorComponent />;
}

export function useParams() {
  return useContext(RouterContext).params;
}

export function useSearchParams() {
  return useContext(RouterContext).searchParams;
}

export function usePathname() {
  return useContext(RouterContext).pathname;
}
