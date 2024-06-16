import React from "react";
import { Suspense } from "react";
import { Router, useLoaderData } from "framework/router";
import { Scripts } from "framework/react";

export default function App() {
  console.log("Calling actual <App/>");

  return (
    <React.StrictMode>
      <Root>
        <Suspense>
          <Router />
        </Suspense>
      </Root>
    </React.StrictMode>
  );
}

function Root({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.png" />
        <title>My App</title>
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
