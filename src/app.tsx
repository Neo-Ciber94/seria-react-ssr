import React from "react";
import { Suspense } from "react";
import { Router } from "./core/router";

export function App() {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="/build/client/seria.js" />
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
    return this.props.children;
  }
}
