import { default as App, errorCatchers, routes } from "../app-entry";
import { ServerContextProvider } from "./context";

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
