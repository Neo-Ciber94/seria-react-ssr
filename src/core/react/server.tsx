import React, { useCallback, useMemo, useState } from "react";
import { createContext, PropsWithChildren, useContext } from "react";
import { LoaderFunction } from "../server/loader";
import {
  HEADER_LOADER_DATA,
  HEADER_ROUTE_ERROR,
  HEADER_SERIA_STREAM,
} from "../constants";
import * as seria from "seria";
import { type TypedJson } from "../server/http";

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
  setAppContext: (appContext: AppContext) => void;
};

const ServerContext = createContext<ServerContextProps>({
  setAppContext: () => {},
  appContext: {
    loaderData: undefined,
    url: "",
    pathname: "",
  },
});

type ServerContextProviderProps = PropsWithChildren<{
  appContext: AppContext;
}>;

export function ServerContextProvider(props: ServerContextProviderProps) {
  const [appContext, setAppContext] = useState<AppContext>(props.appContext);

  return (
    <ServerContext.Provider value={{ appContext, setAppContext }}>
      {props.children}
    </ServerContext.Provider>
  );
}

type LoaderDataType<T> =
  T extends Promise<infer U>
    ? LoaderDataType<U>
    : T extends Response
      ? never
      : T extends TypedJson<infer O>
        ? LoaderDataType<O>
        : T extends (...args: any[]) => unknown
          ? never
          : T;

export type LoaderReturnType<T> =
  T extends LoaderFunction<infer U> ? LoaderDataType<U> : never;

export function useLoaderData<L extends LoaderFunction<unknown>>() {
  return useContext(ServerContext).appContext.loaderData as LoaderReturnType<L>;
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

type NavigateOptions = {
  replace: boolean;
};

export function useNavigation() {
  const { setAppContext } = useContext(ServerContext);
  const navigate = useCallback(
    async (pathname: string, options?: NavigateOptions) => {
      const { replace = false } = options || {};
      const response = await fetch(pathname, {
        headers: {
          [HEADER_LOADER_DATA]: "1",
        },
      });

      if (!response.ok) {
        throw new Error("Loader data response error");
      }

      if (response.headers.has(HEADER_ROUTE_ERROR)) {
        // Throw the error so the error boundary handle it
      }

      if (!response.headers.has(HEADER_SERIA_STREAM)) {
        if (!response.body) {
          throw new Error("Response body was empty");
        }

        const stream = response.body.pipeThrough(new TextDecoderStream());
        const loaderData = (await seria.parseFromStream(stream)) as AppContext;

        if (replace) {
          window.history.replaceState(loaderData, "", loaderData.url);
        } else {
          window.history.pushState(loaderData, "", loaderData.url);
        }

        setAppContext({
          loaderData,
          pathname: loaderData.pathname,
          url: loaderData.url,
          error: loaderData.error,
        });
      }
    },
    []
  );

  return navigate;
}
