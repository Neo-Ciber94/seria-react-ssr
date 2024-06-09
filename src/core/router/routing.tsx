import React, { useCallback, useContext, useEffect, useState } from "react";
import { createContext, useMemo } from "react";
import { matchErrorRoute, matchRoute } from "../../$routes";
import { ErrorPage, NotFound } from "./components";
import { RouteErrorBoundary } from "./error";
import { HttpError } from "../server/http";
import { AppContext, useAppContext } from "../react/entry";
import * as seria from "seria";
import {
  HEADER_LOADER_DATA,
  HEADER_SERIA_STREAM,
  HEADER_ROUTE_REDIRECT,
  HEADER_ROUTE_ERROR,
} from "../constants";
import { RouteProvider } from "./contexts";

export type Params = Record<string, string | string[] | undefined>;

type RouterDataProps = {
  routeData: AppContext;
  setRouteData: (ctx: React.SetStateAction<AppContext>) => void;
};

const RouterDataContext = createContext<RouterDataProps | null>(null);

function RouteDataProvider(props: { children: React.ReactNode }) {
  const hydrationContext = useAppContext();
  const [routeData, setRouteData] = useState(hydrationContext);

  return (
    <RouterDataContext.Provider value={{ routeData, setRouteData }}>
      {props.children}
    </RouterDataContext.Provider>
  );
}

type NavigationStatus = "pending" | "error" | "loaded";

type NavigateOptions = {
  replace?: boolean;
  updateHistory?: boolean;
};

type NavigationContextProps = {
  navigationStatus: NavigationStatus;
  refresh: () => Promise<void>;
  navigate: (
    url: string,
    options?: { replace?: boolean; updateHistory?: boolean },
  ) => Promise<void>;
};

const NavigationContext = createContext<NavigationContextProps | null>(null);

const MAX_REDIRECTS = 10;

type FetchLoaderDataResult =
  | { type: "redirect"; to: string }
  | { type: "success"; data: AppContext }
  | undefined;

async function fetchRouteData(url: string): Promise<FetchLoaderDataResult> {
  const response = await fetch(url, {
    headers: {
      [HEADER_LOADER_DATA]: "1",
    },
  });

  // Data
  if (response.headers.has(HEADER_SERIA_STREAM)) {
    if (!response.body) {
      throw new Error("Response body was empty");
    }

    const stream = response.body.pipeThrough(new TextDecoderStream());
    const context = await seria.parseFromStream(stream);

    return {
      type: "success",
      data: context as AppContext,
    };
  }
  // Redirect
  else if (response.headers.has(HEADER_ROUTE_REDIRECT)) {
    const to = response.headers.get(HEADER_ROUTE_REDIRECT) ?? "/";
    return { type: "redirect", to };
  }
  // Error
  else if (!response.ok) {
    if (
      response.headers.has(HEADER_ROUTE_ERROR) &&
      response.headers.get("content-type") === "text/plain"
    ) {
      const message = await response.text();
      throw new HttpError(response.status, message);
    }

    throw new Error("Navigation error");
  } else {
    return undefined;
  }
}

function isExternalUrl(url: string) {
  const isAbsolute = /^https?:\/\//i.test(url);

  if (isAbsolute) {
    const { origin } = new URL(url);
    return origin !== location.origin;
  }

  return false;
}

function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [navigationError, setNavigationError] = useState<Error>();
  const [navigationStatus, setNavigationStatus] = useState<NavigationStatus>("loaded");
  const routeDataCtx = useRouteDataContext();
  const url = routeDataCtx.routeData.url;
  const setRouteData = routeDataCtx.setRouteData;

  if (navigationError) {
    throw navigationError;
  }

  const navigateToUrl = useCallback(
    async (url: string, redirectCount: number, options?: NavigateOptions) => {
      const { replace = false, updateHistory = true } = options || {};

      if (isExternalUrl(url)) {
        window.location.href = url;
      }

      let hasError = false;

      try {
        if (redirectCount >= MAX_REDIRECTS) {
          throw new Error("Too many redirects");
        }

        setNavigationStatus("pending");
        const result = await fetchRouteData(url);

        if (!result) {
          return;
        }

        switch (result.type) {
          case "success": {
            const { data } = result;

            if (updateHistory) {
              if (replace) {
                history.replaceState({}, "", data.url);
              } else {
                history.pushState({}, "", data.url);
              }
            }

            setRouteData(data);
            break;
          }
          case "redirect": {
            // If the url is absolute, we send the user outside the app
            if (isExternalUrl(result.to)) {
              window.location.href = result.to;
            } else {
              navigateToUrl(result.to, redirectCount + 1, options);
            }
            break;
          }
        }
      } catch (err) {
        hasError = true;

        if (err instanceof Error) {
          setNavigationError(err);
        }

        setNavigationStatus("error");
      } finally {
        if (!hasError) {
          setNavigationStatus("loaded");
        }
      }
    },
    [],
  );

  const navigate = useCallback(
    async (url: string, options?: NavigateOptions) => {
      return navigateToUrl(url, 0, options);
    },
    [navigateToUrl],
  );

  const refresh = useCallback(() => navigate(url), [navigate]);

  return (
    <NavigationContext.Provider
      value={{
        navigationStatus,
        navigate,
        refresh,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

type RouterContextProps = {
  params: Params;
  pathname: string;
  searchParams: URLSearchParams;
};

const RouterContext = createContext<RouterContextProps | null>(null);

function Routes() {
  const { pathname, searchParams } = useUrl();
  const { params, match } = useMatch();
  const { navigate } = useNavigation();
  const error = useRouteError();

  useEffect(() => {
    const handlePopState = async (_event: PopStateEvent) => {
      const search = location.search ? `?${location.search}` : "";
      const url = `${location.pathname}${search}`;
      await navigate(url, { updateHistory: false });
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [navigate]);

  const Component = useCallback(() => {
    if (match?.component == null) {
      return <NotFound />;
    }

    let Comp = (
      <RouteProvider routePath={match.routePath}>
        <match.component />
      </RouteProvider>
    );

    const layouts = match.layouts || [];
    for (const layout of layouts) {
      const Layout = layout.component;
      if (Layout == null) {
        continue;
      }

      Comp = (
        <RouteProvider routePath={layout.layoutPath}>
          <Layout>{Comp}</Layout>
        </RouteProvider>
      );
    }

    return Comp;
  }, [match]);

  return (
    <RouterContext.Provider
      value={{
        params,
        pathname,
        searchParams,
      }}
    >
      <RouteErrorBoundary key={pathname} error={error} fallback={() => <ErrorFallback />}>
        <Component />
      </RouteErrorBoundary>
    </RouterContext.Provider>
  );
}

export function Router() {
  return (
    <RouteDataProvider>
      <NavigationProvider>
        <Routes />
      </NavigationProvider>
    </RouteDataProvider>
  );
}

function useRouteDataContext() {
  const ctx = useContext(RouterDataContext);

  if (!ctx) {
    throw new Error("RouterDataContext is not available");
  }

  return ctx;
}

export function useRouteData() {
  return useRouteDataContext().routeData;
}

export function useRouterContext() {
  const ctx = useContext(RouterContext);

  if (!ctx) {
    throw new Error("RouterContext is not available");
  }

  return ctx;
}

function ErrorFallback() {
  const pathname = usePathname();
  const Component = useMemo(() => {
    const match = matchErrorRoute(pathname);
    return match?.component ?? ErrorPage;
  }, [pathname]);

  return <Component />;
}

function useMatch() {
  const pathname = usePathname();
  return useMemo(() => {
    const match = matchRoute(pathname);
    const params = match?.params || {};
    return { params, match };
  }, [pathname]);
}

function useRouteError() {
  const { error } = useRouteData();
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

function useUrl() {
  const url = useRouteData().url;
  return useMemo(() => new URL(url), [url]);
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);

  if (!ctx) {
    throw new Error("NavigationContext is not available");
  }

  return ctx;
}

export function useParams<T extends Params = Params>() {
  return useRouterContext().params as T;
}

export function usePathname() {
  return useUrl().pathname;
}

export function useSearchParams() {
  const { searchParams } = useRouterContext();
  const { navigate } = useNavigation();
  const pathname = usePathname();

  const setSearchParams = useCallback(
    (newValue: React.SetStateAction<URLSearchParams>) => {
      const val = typeof newValue === "function" ? newValue(searchParams) : newValue;
      const urlParams = new URLSearchParams(val);
      const url = `${pathname}?${urlParams}`;
      navigate(url, { replace: true });
    },
    [searchParams],
  );

  return [searchParams, setSearchParams] as const;
}
