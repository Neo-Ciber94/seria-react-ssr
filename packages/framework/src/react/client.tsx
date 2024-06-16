import React from "react";
import App from "../virtual/virtual__app";
import { ServerContextProvider } from "./context";
import { routes, errorCatchers } from "../virtual/virtual__routes";
import { Router } from "../router";

export function EntryClient() {
  return (
    <ServerContextProvider
      appContext={window.APP_CONTEXT}
      routes={routes}
      errorCatchers={errorCatchers}
    >
      <App routes={routes} errorCatchers={errorCatchers} appContext={window.APP_CONTEXT}>
        <Router />
      </App>
    </ServerContextProvider>
  );
}
