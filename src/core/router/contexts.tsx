import React, { useContext } from "react";
import { createContext, PropsWithChildren } from "react";

const RouteIdContext = createContext<string | null>(null);

type RouteIdProps = {
  routeId: string;
};

export function RouteIdProvider(props: PropsWithChildren<RouteIdProps>) {
  return <RouteIdContext.Provider value={props.routeId}>{props.children}</RouteIdContext.Provider>;
}

export function useRouteId() {
  const routeId = useContext(RouteIdContext);

  if (!routeId) {
    throw new Error("Unable to resolve route id");
  }

  return routeId;
}
