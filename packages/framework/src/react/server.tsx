import { default as Entry } from "../app-entry";
import { type AppContext, ServerContextProvider } from "./context";
import type { ErrorCatcher, Route } from "../router/routing";
import { type Manifest } from "vite";

export type EntryServerContext = {
  routes: Route[];
  errorCatchers: ErrorCatcher[];
  manifest: Manifest | undefined;
  Component?: any;
};

type EntryServerProps = {
  appContext: AppContext;
  json: string;
  isResumable: boolean;
  serverContext: EntryServerContext;
};

export function EntryServer({ appContext, json, isResumable, serverContext }: EntryServerProps) {
  const { url } = appContext;
  const routeError = appContext.error ? `,error:${JSON.stringify(appContext.error)}` : "";
  const { routes, errorCatchers, manifest, Component = Entry } = serverContext;

  return (
    <ServerContextProvider
      appContext={appContext}
      errorCatchers={errorCatchers}
      routes={routes}
      manifest={manifest}
    >
      <Component />
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
