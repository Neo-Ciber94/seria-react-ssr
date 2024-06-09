import React, { useContext } from "react";
import { createContext, PropsWithChildren } from "react";

const RouteContext = createContext<string | null>(null);

type RouteIdProps = {
  routePath: string;
};

export function RouteProvider(props: PropsWithChildren<RouteIdProps>) {
  return <RouteContext.Provider value={props.routePath}>{props.children}</RouteContext.Provider>;
}

export function useRoutePath() {
  const routePath = useContext(RouteContext);

  if (!routePath) {
    throw new Error("Unable to resolve route path");
  }

  return routePath;
}
