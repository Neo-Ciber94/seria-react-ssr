import React, { useContext, useState } from "react";
import { createContext, PropsWithChildren } from "react";
import { AppContext, useServerContext } from "../react/context";
import { ErrorCatcher, Route } from "./routing";
import { invariant } from "../internal";

const RouteContext = createContext<RouteProviderProps | null>(null);

type RouteProviderProps = {
  id: string;
  path: string;
};

export function RouteProvider(props: PropsWithChildren<RouteProviderProps>) {
  return (
    <RouteContext.Provider value={{ id: props.id, path: props.path }}>
      {props.children}
    </RouteContext.Provider>
  );
}

export function useRoute() {
  const route = useContext(RouteContext);

  if (!route) {
    throw new Error("RouteContext was not available");
  }

  return route;
}

type RouterDataProps = {
  routeData: AppContext;
  setRouteData: (ctx: React.SetStateAction<AppContext>) => void;
};

const RouterDataContext = createContext<RouterDataProps | null>(null);

export function RouteDataProvider(props: { children: React.ReactNode }) {
  const { appContext } = useServerContext();
  const [routeData, setRouteData] = useState(appContext);

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
