import { EntryClient, EntryServer } from "./entry";
export { EntryClient, EntryServer };
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createContext, PropsWithChildren, useContext } from "react";
import { LoaderFunction } from "../server/loader";
import {
  HEADER_LOADER_DATA,
  HEADER_ROUTE_ERROR,
  HEADER_SERIA_STREAM,
} from "../constants";
import * as seria from "seria";
import { HttpError, type TypedJson } from "../server/http";

export type AppContext = {
  loaderData: any;
  url: string;
  error?: {
    status: number;
    message?: string;
  };
};

type ServerContextProps = {
  appContext: AppContext;
  setAppContext: (appContext: React.SetStateAction<AppContext>) => void;
};

const ServerContext = createContext<ServerContextProps>({
  setAppContext: () => {},
  appContext: {
    loaderData: undefined,
    url: "",
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

type LoaderReturnType<T> =
  T extends LoaderFunction<infer U> ? LoaderDataType<U> : never;

export function useLoaderData<L extends LoaderFunction<unknown>>() {
  return useContext(ServerContext).appContext.loaderData as LoaderReturnType<L>;
}

export function useUrl() {
  const url = useContext(ServerContext).appContext.url;
  return useMemo(() => new URL(url), [url]);
}

export function useError() {
  return useContext(ServerContext).appContext.error;
}

async function fetchLoaderData(url: string) {
  const response = await fetch(url, {
    redirect: "manual",
    headers: {
      [HEADER_LOADER_DATA]: "1",
    },
  });

  if (response.redirected) {
    throw new Error("Redirection not implemented");
  }

  if (!response.ok) {
    if (
      response.headers.has(HEADER_ROUTE_ERROR) &&
      response.headers.get("content-type") === "text/plain"
    ) {
      const message = await response.text();
      throw new HttpError(response.status, message);
    }

    throw new Error("Navigation error");
  }

  if (response.headers.has(HEADER_SERIA_STREAM)) {
    if (!response.body) {
      throw new Error("Response body was empty");
    }

    const stream = response.body.pipeThrough(new TextDecoderStream());
    const context = await seria.parseFromStream(stream);
    return context as AppContext;
  }
}

type NavigateOptions = {
  replace?: boolean;
  updateHistory?: boolean;
};

export function useNavigation() {
  const { setAppContext } = useContext(ServerContext);
  const [navigationError, setNavigationError] = useState<Error>();

  if (navigationError) {
    throw navigationError;
  }

  const navigate = useCallback(
    async (url: string, options?: NavigateOptions) => {
      const { replace = false, updateHistory = true } = options || {};

      try {
        const appCtx = await fetchLoaderData(url);

        if (!appCtx) {
          return;
        }

        if (updateHistory) {
          if (replace) {
            history.replaceState({}, "", appCtx.url);
          } else {
            history.pushState({}, "", appCtx.url);
          }
        }

        setAppContext(appCtx);
      } catch (err) {
        if (err instanceof Error) {
          setNavigationError(err);
        }
      }
    },
    []
  );

  useEffect(() => {
    const handlePopState = async (_event: PopStateEvent) => {
      const search = location.search ? `?${location.search}` : location.search;
      const url = `${location.pathname}${search}`;
      await navigate(url, { updateHistory: false });
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  return navigate;
}
