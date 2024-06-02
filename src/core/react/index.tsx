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

// if (typeof window !== "undefined") {
//   const context = document.getElementById("app-data")?.innerText;
//   const data = JSON.parse(context || "{}");
//   window.APP_CONTEXT = data;
//   console.log(data);
// }

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
  const raw = JSON.stringify(loaderData || {});

  // const ctx = JSON.stringify({
  //   loaderData: loaderData || {},
  //   pathname,
  //   url,
  // });

  return (
    <ServerContextProvider appContext={appContext}>
      <App />
      <script
        id="app-context"
        dangerouslySetInnerHTML={{
          __html: `window.APP_CONTEXT = {
            loaderData: JSON.parse(${JSON.stringify(raw)}),
            pathname: ${JSON.stringify(pathname)},
            url: ${JSON.stringify(url)}
          }`,
        }}
      />
      {/* <script
        type="application/json"
        id="app-data"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ctx) }}
      /> */}
    </ServerContextProvider>
  );
}
