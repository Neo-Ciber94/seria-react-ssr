import React from "react";
import { App } from "../../app";
import { ServerContextProvider, AppContext } from "./server";

declare global {
  var APP_CONTEXT: {
    loaderData: any;
    pathname: string;
    url: string;
    error?: {
      statusCode: number;
      message?: string;
    };
  };
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

export function EntryServer({
  appContext,
  json,
  isResumable,
}: EntryServerProps) {
  const { pathname, url } = appContext;
  const appError = appContext.error
    ? `error: ${JSON.stringify(appContext.error)}`
    : "";

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

          window.APP_CONTEXT = {
            loaderData,
            pathname: ${JSON.stringify(pathname)},
            url: ${JSON.stringify(url)},
            ${appError}
          }`,
          }}
        />
      ) : (
        <script
          id="app-context"
          dangerouslySetInnerHTML={{
            __html: `
            window.APP_CONTEXT = {
              loaderData: $seria_parse(${JSON.stringify(json)}),
              pathname: ${JSON.stringify(pathname)},
              url: ${JSON.stringify(url)},
              ${appError}
            }`,
          }}
        />
      )}
    </ServerContextProvider>
  );
}
