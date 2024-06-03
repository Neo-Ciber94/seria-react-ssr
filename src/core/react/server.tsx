import React, { useMemo } from "react";
import { createContext, PropsWithChildren, useContext } from "react";
import { LoaderFunction } from "../server/loader";

export type AppContext = {
  loaderData: any;
  pathname: string;
  url: string;
  error?: {
    statusCode: number;
    message?: string;
  };
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

type UsePageError = {
  statusCode: number;
  message?: string;
};

export function usePageError(): UsePageError {
  const { error } = useContext(ServerContext).appContext;

  if (error == null) {
    throw new Error("'usePageError' can only be called on '_error' pages");
  }

  return error;
}

export function useHasError() {
  const { error } = useContext(ServerContext).appContext;
  return error != null;
}
