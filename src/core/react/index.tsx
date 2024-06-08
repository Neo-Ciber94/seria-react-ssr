import { EntryClient, EntryServer } from "./entry";
export { EntryClient, EntryServer };
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createContext, PropsWithChildren, useContext } from "react";
import { LoaderFunction } from "../server/loader";
import {
  HEADER_LOADER_DATA,
  HEADER_ROUTE_ERROR,
  HEADER_ROUTE_REDIRECT,
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
  return useMemo(() => new URL(url, "http://app"), [url]);
}

export function useError() {
  return useContext(ServerContext).appContext.error;
}

type FetchLoaderDataResult =
  | { type: "redirect"; to: string }
  | { type: "success"; data: AppContext }
  | undefined;

async function fetchLoaderData(url: string): Promise<FetchLoaderDataResult> {
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
  else if (response.ok) {
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

type NavigateOptions = {
  replace?: boolean;
  updateHistory?: boolean;
};

const MAX_REDIRECTS = 20;

export function useNavigation() {
  const { setAppContext } = useContext(ServerContext);
  const [navigationError, setNavigationError] = useState<Error>();

  if (navigationError) {
    throw navigationError;
  }

  const navigateToUrl = useCallback(
    async (url: string, redirectCount: number, options?: NavigateOptions) => {
      const { replace = false, updateHistory = true } = options || {};

      try {
        if (redirectCount > MAX_REDIRECTS) {
          throw new Error("Too many redirects");
        }

        const result = await fetchLoaderData(url);

        if (!result) {
          return;
        }

        switch (result.type) {
          case "success": {
            const { data: appCtx } = result;

            if (updateHistory) {
              if (replace) {
                history.replaceState({}, "", appCtx.url);
              } else {
                history.pushState({}, "", appCtx.url);
              }
            }

            setAppContext(appCtx);
            break;
          }
          case "redirect": {
            // If the url is absolute, we send the user outside the app
            if (/^https?:\/\//i.test(result.to)) {
              window.location.href = result.to;
            } else {
              navigateToUrl(result.to, redirectCount, options);
            }
            break;
          }
        }
      } catch (err) {
        if (err instanceof Error) {
          setNavigationError(err);
        }
      }
    },
    []
  );

  const navigate = useCallback(
    async (url: string, options?: NavigateOptions) => {
      return navigateToUrl(url, 0, options);
    },
    [navigateToUrl]
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
