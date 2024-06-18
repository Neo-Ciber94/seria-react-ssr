import React from "react";
import { ServerContextProvider } from "./context";
import { Router } from "../router";
import App from "../virtual/virtual__app";
import { routes, errorCatchers } from "../virtual/virtual__routes";
// import App from "virtual/entry";
// import { routes, errorCatchers } from "virtual/routes";

export function EntryClient() {
  return (
    <ServerContextProvider
      appContext={window.APP_CONTEXT}
      routes={routes}
      errorCatchers={errorCatchers}
    >
      <App />
    </ServerContextProvider>
  );
}
