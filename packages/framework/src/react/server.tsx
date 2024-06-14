import React from "react";
import { App } from "../virtual/virtual__app";
import { type AppContext, ServerContextProvider } from "./context";
import { ErrorCatcher, Route } from "../router/routing";

type EntryServerProps = {
  appContext: AppContext;
  json: string;
  isResumable: boolean;
  routes: Route[];
  errorCatchers: ErrorCatcher[];
};

export function EntryServer({
  appContext,
  json,
  isResumable,
  routes,
  errorCatchers,
}: EntryServerProps) {
  const { url } = appContext;
  const appError = appContext.error ? `error: ${JSON.stringify(appContext.error)}` : "";

  return (
    <ServerContextProvider appContext={appContext} errorCatchers={errorCatchers} routes={routes}>
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
