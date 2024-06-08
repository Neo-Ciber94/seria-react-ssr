import React, { useContext, useEffect } from "react";
import { createContext, useMemo } from "react";
import { useError, useNavigation, useUrl } from "../react";
import { matchErrorRoute, matchRoute } from "../../$routes";
import { ErrorPage, NotFound } from "./error";
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
  const { params, component: Component = NotFound } = useMatch();
  const error = useRouteError();
  const navigation = useNavigation();

  useEffect(() => {
    const handlePopState = async (_event: PopStateEvent) => {
      const search = location.search ? `?${location.search}` : "";
      const url = `${location.pathname}${search}`;
      await navigation(url, { updateHistory: false });
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [navigation]);

  return (
    <RouterContext.Provider
      value={{
        params,
        pathname,
        searchParams,
      }}
    >
      <ErrorBoundary error={error} fallback={() => <ErrorFallback />}>
        <Component />
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

function useMatch() {
  const { pathname } = useUrl();
  return useMemo(() => {
    const match = matchRoute(pathname);
    const params = match?.params || {};
    return { params, ...match };
  }, [pathname]);
}

function useRouteError() {
  const error = useError();
  return useMemo(() => {
    const message = (() => {
      if (error?.message) {
        return error.message;
      }

      if (error?.status === 404) {
        return "Not Found";
      }

      return "Internal Error";
    })();

    return error ? new HttpError(error.status, message) : undefined;
  }, [error]);
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
