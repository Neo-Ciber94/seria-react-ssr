import { ServerContextProvider } from "./context";
import App from "../virtual/virtual__app";
import { routes, errorCatchers } from "../virtual/virtual__routes";

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
