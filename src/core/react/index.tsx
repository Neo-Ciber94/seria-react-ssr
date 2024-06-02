import React from "react";
import { App } from "../../app";
import { ServerContextProvider, AppContext, useLoaderData } from "./server";

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
  const { pathname, loaderData } = appContext;

  const jsonPayload =
    loaderData === undefined ? "'{}'" : `'${JSON.stringify(loaderData)}'`;

  return (
    <ServerContextProvider appContext={appContext}>
      <App />
      <script
        id="server-props"
        dangerouslySetInnerHTML={{
          __html: `window.APP_CONTEXT = {
            loaderData: JSON.parse(${jsonPayload}),
            pathname: ${JSON.stringify(pathname)},
            url: ${JSON.stringify(appContext.url)}
          }`,
        }}
      />
    </ServerContextProvider>
  );
}
