import React from "react";
import { Suspense } from "react";
import { Router } from "./core/router";

export function App() {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src={"/seria.js"} />
        <link rel="icon" href="/favicon.png" />
      </head>
      <body>
        <Suspense>
          <Router />
        </Suspense>
      </body>
    </html>
  );
}
