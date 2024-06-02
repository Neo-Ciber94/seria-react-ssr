import React, { useMemo } from "react";
import { createContext, PropsWithChildren, useContext } from "react";
import { LoaderFunction } from "../server/loader";

export type AppContext = {
  loaderData: any;
  pathname: string;
  url: string;
};

type ServerContextProps = {
  appContext: AppContext;
};

const ServerContext = createContext<ServerContextProps>({
  appContext: {
    loaderData: undefined,
    url: "",
    pathname: "",
  },
});

type ServerContextProviderProps = PropsWithChildren<ServerContextProps>;

export function ServerContextProvider(props: ServerContextProviderProps) {
  const { children, ...rest } = props;

  return (
    <ServerContext.Provider value={rest}>{children}</ServerContext.Provider>
  );
}

export function useLoaderData<L extends LoaderFunction<unknown>>() {
  return useContext(ServerContext).appContext.loaderData as Awaited<
    ReturnType<L>
  >;
}

export function useUrl() {
  const url = useContext(ServerContext).appContext.url;
  return useMemo(() => new URL(url, "http://localhost"), [url]);
}
