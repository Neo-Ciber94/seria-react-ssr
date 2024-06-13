import React, { useContext, useState } from "react";
import { createContext, PropsWithChildren } from "react";
import { AppContext, useAppContext } from "../react/entry";

const RouteContext = createContext<string | null>(null);

type RouteProviderProps = {
  routePath: string;
};

export function RouteProvider(props: PropsWithChildren<RouteProviderProps>) {
  return <RouteContext.Provider value={props.routePath}>{props.children}</RouteContext.Provider>;
}

export function useRoutePath() {
  const routePath = useContext(RouteContext);

  if (!routePath) {
    throw new Error("RouteContext was not available");
  }

  return routePath;
}

type RouterDataProps = {
  routeData: AppContext;
  setRouteData: (ctx: React.SetStateAction<AppContext>) => void;
};

const RouterDataContext = createContext<RouterDataProps | null>(null);

export function RouteDataProvider(props: { children: React.ReactNode }) {
  const hydrationContext = useAppContext();
  const [routeData, setRouteData] = useState(hydrationContext);

  return (
    <RouterDataContext.Provider value={{ routeData, setRouteData }}>
      {props.children}
    </RouterDataContext.Provider>
  );
}

export function useRouteDataContext() {
  const ctx = useContext(RouterDataContext);

  if (!ctx) {
    throw new Error("RouterDataContext is not available");
  }

  return ctx;
}

export function useRouteData() {
  return useRouteDataContext().routeData;
}
