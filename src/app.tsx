import React from "react";
import { Suspense } from "react";
import { Router } from "./core/router";

const REACT_REFRESH_FRAGMENT = `
import RefreshRuntime from '/@react-refresh'
RefreshRuntime.injectIntoGlobalHook(window)
window.$RefreshReg$ = () => {}
window.$RefreshSig$ = () => (type) => type
window.__vite_plugin_react_preamble_installed__ = true
`;

export function App() {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.png" />
        <script src="/build/client/seria.js" />
        <script type="module" src="/@vite/client"></script>
        <script
          type="module"
          dangerouslySetInnerHTML={{
            __html: REACT_REFRESH_FRAGMENT,
          }}
        />
      </head>
      <body>
        <Suspense>
          <Router />
        </Suspense>
      </body>
    </html>
  );
}
