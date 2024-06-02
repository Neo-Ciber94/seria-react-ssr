import React from "react";
import { App } from "../../app";
import { ServerContextProvider, AppContext, useLoaderData } from "./server";
import * as seria from "seria";

export { useLoaderData };

declare global {
  var APP_CONTEXT: {
    loaderData: any;
    pathname: string;
    url: string;
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
};

export function EntryServer({ appContext }: EntryServerProps) {
  const { pathname, loaderData, url } = appContext;
  const raw = seria.stringify(loaderData || {});

  return (
    <ServerContextProvider appContext={appContext}>
      <App />
      <script
        id="app-context"
        dangerouslySetInnerHTML={{
          __html: `window.APP_CONTEXT = {
            loaderData: $seria_parse(${JSON.stringify(raw)}),
            pathname: ${JSON.stringify(pathname)},
            url: ${JSON.stringify(url)}
          }`,
        }}
      />
    </ServerContextProvider>
  );
}
