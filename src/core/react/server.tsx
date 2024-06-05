import React, { useCallback, useMemo, useState } from "react";
import { createContext, PropsWithChildren, useContext } from "react";
import { LoaderFunction } from "../server/loader";
import { HEADER_LOADER_DATA } from "../constants";
import * as seria from "seria";

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

      if (response.headers.has("x-seria-stream")) {
        if (!response.body) {
          throw new Error("Response body was empty");
        }

        const stream = response.body.pipeThrough(new TextDecoderStream());
        const loaderData = await seria.parseFromStream(stream);
        setAppContext({
          loaderData,
          pathname,
          url: "?",
          error: undefined,
        });
      } else {
        // nothing?
      }
    },
    []
  );

  return navigate;
}
