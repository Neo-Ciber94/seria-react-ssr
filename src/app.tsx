import React from "react";
import { Suspense } from "react";
import { Router } from "./core/router";

export function App() {
  return (
    <Root>
      <Suspense>
        <Router />
      </Suspense>
    </Root>
  );
}

function Root({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.png" />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function Scripts() {
  return (
    <>
      <script src="/build/client/assets/seria.js" />
      <script rel="modulepreload" src="/src/entry.client.tsx" />
    </>
  );
}
