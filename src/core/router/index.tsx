import React, { useContext } from "react";
import { createContext, useMemo } from "react";
import { useUrl } from "../react/server";
import { matchRoute } from "../../$routes";
import NotFoundPage from "./404";

export type Params = Record<string, string | undefined>;

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

  return (
    <RouterContext.Provider value={{ params, pathname, searchParams }}>
      <Component />
    </RouterContext.Provider>
  );
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
