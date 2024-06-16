import React from "react";
import { Suspense } from "react";
import { Router } from "framework/router";
import { AppContext, LiveReload, Scripts, ServerContextProvider } from "framework/react";
import { ErrorCatcher, Route } from "framework/router/routing";

// export default function App() {
//   console.log("Calling actual <App/>");

//   return (
//     <React.StrictMode>
//       <Root>
//         <Suspense>
//           <Router />
//         </Suspense>
//       </Root>
//     </React.StrictMode>
//   );
// }

type AppProps = {
  appContext: AppContext;
  routes: Route[];
  errorCatchers: ErrorCatcher[];
  children: React.ReactNode;
};

export default function App({ children, appContext, routes, errorCatchers }: AppProps) {
  console.log("Calling actual <App/>");

  console.log({ routes, errorCatchers });
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
          <ServerContextProvider
            appContext={appContext}
            routes={routes}
            errorCatchers={errorCatchers}
          >
            {/* {children} */}
            <Router />
          </ServerContextProvider>
        </Suspense>
        <Scripts />
      </body>
    </html>
  );
}
