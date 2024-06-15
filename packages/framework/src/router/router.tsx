import React, { useCallback, useContext, useEffect } from "react";
import { createContext, useMemo } from "react";
import { ErrorPage, NotFound } from "./components";
import { RouteErrorBoundary } from "./error";
import { RouteDataProvider, RouteProvider, useRouteData } from "./contexts";
import { NavigationProvider, useNavigation } from "./navigation";
import { useUrl, useMatch, useRouteError, usePathname } from "./hooks";
import { Params, Route } from "./routing";
import { useAppContext } from "../react/context";

type RouterContextProps = {
  params: Params;
  pathname: string;
  searchParams: URLSearchParams;
};

const RouterContext = createContext<RouterContextProps | null>(null);

function Routes() {
  const { pathname, searchParams } = useUrl();
  const { router } = useAppContext();
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

    return <RouteComponent route={match} />;
  }, [match, router]);

  console.log(<Component />);
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

function RouteComponent({ route }: { route: Route }) {
  // return useMemo(() => {
  //   let Component = (
  //     <RouteProvider id={route.id} path={route.path}>
  //       <route.component />
  //     </RouteProvider>
  //   );

  //   const layouts = route.layouts || [];
  //   for (const layout of layouts) {
  //     const Layout = layout.component;
  //     if (Layout == null) {
  //       continue;
  //     }

  //     Component = (
  //       <RouteProvider id={layout.id} path={route.path}>
  //         <Layout>{Component}</Layout>
  //       </RouteProvider>
  //     );
  //   }

  //   return Component;
  // }, [route]);

  return (
    <RouteProvider id={route.id} path={route.path}>
      <HomePage />
      <h1>Hey!</h1>
    </RouteProvider>
  );
}

function HomePage() {
  const data = useRouteData().loaderData["/index"];
  return (
    <div>
      <h1>Hello {data.word}</h1>
      <button onClick={() => alert("Hey, Hello there")}>Click Me</button>
    </div>
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

export function useRouterContext() {
  const ctx = useContext(RouterContext);

  if (!ctx) {
    throw new Error("RouterContext is not available");
  }

  return ctx;
}

function ErrorFallback() {
  const pathname = usePathname();
  const { errorRouter } = useAppContext();
  const Component = useMemo(() => {
    const match = errorRouter.match(pathname);
    return match?.component ?? ErrorPage;
  }, [pathname, errorRouter]);

  return <Component />;
}
