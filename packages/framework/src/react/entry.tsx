import React, { createContext, PropsWithChildren, useContext } from "react";
import { App } from "../virtual/app.virtual";

export type AppContext = {
  loaderData: Record<string, any>;
  url: string;
  error?: {
    status: number;
    message?: string;
  };
};

declare global {
  var APP_CONTEXT: AppContext;
}

type ServerContextProps = {
  appContext: AppContext;
};

const ServerContext = createContext<ServerContextProps>({
  appContext: {
    loaderData: {},
    url: "",
  },
});

type ServerContextProviderProps = PropsWithChildren<{
  appContext: AppContext;
}>;

function ServerContextProvider(props: ServerContextProviderProps) {
  return (
    <ServerContext.Provider value={{ appContext: props.appContext }}>
      {props.children}
    </ServerContext.Provider>
  );
}

export function useAppContext() {
  return useContext(ServerContext).appContext;
}

export function EntryClient() {
  return (
    <ServerContextProvider appContext={APP_CONTEXT}>
      <App />
    </ServerContextProvider>
  );
}

type EntryServerProps = {
  appContext: AppContext;
  json: string;
  isResumable: boolean;
};

export function EntryServer({ appContext, json, isResumable }: EntryServerProps) {
  const { url } = appContext;
  const appError = appContext.error ? `error: ${JSON.stringify(appContext.error)}` : "";

  return (
    <ServerContextProvider appContext={appContext}>
      <App />
      {isResumable ? (
        <script
          id="app-context"
          dangerouslySetInnerHTML={{
            __html: `
          const stream = new TransformStream();
          window.$seria_stream_writer = stream.writable.getWriter();
          const loaderData = $seria_parse_from_resumable_stream(${JSON.stringify(json)}, stream.readable); 
          window.APP_CONTEXT = {loaderData,url:${JSON.stringify(url)},${appError}}`,
          }}
        />
      ) : (
        <script
          id="app-context"
          dangerouslySetInnerHTML={{
            __html: `
            window.APP_CONTEXT = {loaderData:$seria_parse(${JSON.stringify(json)}),url:${JSON.stringify(url)},${appError}}`,
          }}
        />
      )}
    </ServerContextProvider>
  );
}
