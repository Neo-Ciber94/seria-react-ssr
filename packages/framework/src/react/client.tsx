import { ServerContextProvider } from "./context";
import { routes, errorCatchers, default as App } from "../app-entry";

export function EntryClient() {
  return (
    <ServerContextProvider
      appContext={window.APP_CONTEXT}
      manifest={window.MANIFEST}
      routes={routes}
      errorCatchers={errorCatchers}
    >
      <App />
    </ServerContextProvider>
  );
}
