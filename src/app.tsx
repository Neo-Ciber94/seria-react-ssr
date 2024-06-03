import React from "react";
import { Suspense } from "react";
import { Router } from "./core/router";

const isDev = process.env.NODE_ENV !== "production";

export function App() {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src={isDev ? "/build/client/seria.js" : "/client/seria.js"} />
        <link rel="icon" href="/favicon.png" />
      </head>
      <body>
        <ErrorBoundary>
          <Suspense>
            <Router />
          </Suspense>
        </ErrorBoundary>
      </body>
    </html>
  );
}

type ErrorBoundaryState = { hasError: boolean };

type ErrorBoundaryProps = { children: React.ReactNode };

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error(error, info);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Internal Error</h1>;
    }

    return this.props.children;
  }
}
