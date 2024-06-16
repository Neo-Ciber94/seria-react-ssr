import React from "react";
import { Suspense } from "react";
import { AppContext, LiveReload, Scripts, ServerContextProvider } from "../react";
import { Route, ErrorCatcher } from "../router/routing";

// export default function App() {
//   console.log("Calling virtual <App/>");

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
  routes: Route[];
  errorCatchers: ErrorCatcher[];
  children: React.ReactNode;
  appContext: AppContext;
};

export default function App({ children, routes, errorCatchers, appContext }: AppProps) {
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
        <ServerContextProvider
          routes={routes}
          errorCatchers={errorCatchers}
          appContext={appContext}
        >
          {children}
        </ServerContextProvider>
        <Scripts />
      </body>
    </html>
  );
}
