import React, { createContext, useContext } from "react";

type ErrorBoundaryContextProps = {
  error?: unknown;
  resetBoundary: () => void;
};

const ErrorBoundaryContext = createContext<ErrorBoundaryContextProps>({
  resetBoundary: () => {},
});

type ErrorBoundaryState = { error: unknown };

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback: (error: unknown) => React.ReactNode;
  onError?: (error: unknown, info: React.ErrorInfo) => void;
};

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
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
      <ErrorBoundaryContext.Provider
        value={{
          error: this.state.error,
          resetBoundary: this.resetBoundary.bind(this),
        }}
      >
        {this.state.error
          ? this.props.fallback(this.state.error)
          : this.props.children}
      </ErrorBoundaryContext.Provider>
    );
  }
}

export function useErrorBoundary() {
  return useContext(ErrorBoundaryContext);
}
