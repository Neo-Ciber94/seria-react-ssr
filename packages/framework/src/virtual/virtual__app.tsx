import { Suspense } from "react";
import { LiveReload, Scripts } from "../react";
import { Router } from "../router";

export default function App() {
  console.log("Calling virtual <App/>");

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.png" />
        <title>This is my application</title>
        <LiveReload />
      </head>
      <body>
        <Suspense>
          <Router />
        </Suspense>
        <Scripts />
      </body>
    </html>
  );
}
