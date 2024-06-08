import React, { createContext, useContext } from "react";
import { HttpError } from "../server/http";

type RouterErrorBoundaryContextProps = {
  error?: unknown;
  resetBoundary: () => void;
};

const RouterErrorBoundaryContext =
  createContext<RouterErrorBoundaryContextProps>({
    resetBoundary: () => {},
  });

type RouterErrorBoundaryState = { error: unknown };

type RouterErrorBoundaryProps = {
  error?: unknown;
  children: React.ReactNode;
  fallback: (error: unknown) => React.ReactNode;
  onError?: (error: unknown, info: React.ErrorInfo) => void;
};

export class RouteErrorBoundary extends React.Component<
  RouterErrorBoundaryProps,
  RouterErrorBoundaryState
> {
  constructor(props: RouterErrorBoundaryProps) {
    super(props);
    this.state = { error: props.error };
  }

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (this.props.onError) {
      this.props.onError(error, info);
    }
  }

  resetBoundary() {
    this.setState({ error: null });
  }

  render() {
    return (
      <RouterErrorBoundaryContext.Provider
        value={{
          error: this.state.error,
          resetBoundary: this.resetBoundary.bind(this),
        }}
      >
        {this.state.error
          ? this.props.fallback(this.state.error)
          : this.props.children}
      </RouterErrorBoundaryContext.Provider>
    );
  }
}

export function useRouterErrorBoundary() {
  return useContext(RouterErrorBoundaryContext);
}

type UsePageError = {
  status: number;
  message?: string;
};

function getPageError(error: unknown) {
  if (error instanceof HttpError) {
    return {
      status: error.status,
      message: error.message,
    };
  }

  const message = error instanceof Error ? error.message : undefined;
  return { status: 500, message };
}

export function usePageError(): UsePageError {
  const { error } = useRouterErrorBoundary();
  return getPageError(error);
}
