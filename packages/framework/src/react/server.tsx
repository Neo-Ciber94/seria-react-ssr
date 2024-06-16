import React from "react";
import { default as AppEntry } from "../virtual/virtual__app";
import { type AppContext, ServerContextProvider } from "./context";
import type { ErrorCatcher, Route } from "../router/routing";
import { type Manifest } from "vite";
import { Router } from "../router/router";

type EntryServerProps = {
  appContext: AppContext;
  json: string;
  isResumable: boolean;
  routes: Route[];
  errorCatchers: ErrorCatcher[];
  manifest: Manifest | undefined;
  Entry?: any;
};

export function EntryServer({
  appContext,
  json,
  isResumable,
  routes,
  errorCatchers,
  manifest,
  Entry,
}: EntryServerProps) {
  const { url } = appContext;
  const routeError = appContext.error ? `,error:${JSON.stringify(appContext.error)}` : "";
  const Root = Entry ?? AppEntry;

  // TODO: Pass this in a more elegant way, preferably a context
  // @ts-ignore
  globalThis.MANIFEST = manifest;

  return (
    <ServerContextProvider appContext={appContext} errorCatchers={errorCatchers} routes={routes}>
      <Root routes={routes} errorCatchers={errorCatchers} appContext={appContext}>
        <Router />
      </Root>
      {manifest && (
        <script
          id="manifest"
          dangerouslySetInnerHTML={{
            __html: `window.MANIFEST = ${JSON.stringify(manifest)}`,
          }}
        />
      )}

      {isResumable ? (
        <script
          id="app-context"
          dangerouslySetInnerHTML={{
            __html: `
            const stream = new TransformStream();
            window.$seria_stream_writer = stream.writable.getWriter();
            const loaderData = $seria_parse_from_resumable_stream(${JSON.stringify(json)},stream.readable); 
            window.APP_CONTEXT = {loaderData,url:${JSON.stringify(url)}${routeError}}`,
          }}
        />
      ) : (
        <script
          id="app-context"
          dangerouslySetInnerHTML={{
            __html: `
              window.APP_CONTEXT = {loaderData:$seria_parse(${JSON.stringify(json)}),url:${JSON.stringify(url)}${routeError}}`,
          }}
        />
      )}
    </ServerContextProvider>
  );
}
