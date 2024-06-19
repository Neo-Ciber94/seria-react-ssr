import {
	type PropsWithChildren,
	createContext,
	useContext,
	useMemo,
} from "react";
import type { Manifest } from "vite";
import {
	type ErrorCatcher,
	type Route,
	type Router,
	createErrorRouter,
	createRouter,
} from "../router/routing";

export type AppContext = {
	loaderData: Record<string, any>;
	url: string;
	error?: {
		status: number;
		message?: string;
	};
};

declare global {
	var APP_CONTEXT: AppContext;
	var MANIFEST: Manifest;
}

type ServerContextProps = {
	appContext: AppContext;
	router: Router<Route>;
	errorRouter: Router<ErrorCatcher>;
	manifest: Manifest | undefined;
};

const ServerContext = createContext<ServerContextProps | null>(null);

type ServerContextProviderProps = PropsWithChildren<{
	appContext: AppContext;
	routes: Route[];
	errorCatchers: ErrorCatcher[];
	manifest: Manifest | undefined;
}>;

export function ServerContextProvider(props: ServerContextProviderProps) {
	const { appContext, errorCatchers, routes, manifest, children } = props;
	const router = useMemo(() => createRouter(routes), [routes]);
	const errorRouter = useMemo(
		() => createErrorRouter(errorCatchers),
		[errorCatchers],
	);

	return (
		<ServerContext.Provider
			value={{
				appContext,
				router,
				errorRouter,
				manifest,
			}}
		>
			{children}
		</ServerContext.Provider>
	);
}

export function useServerContext() {
	const ctx = useContext(ServerContext);

	if (!ctx) {
		throw new Error("'ServerContext' was not available");
	}

	return ctx;
}
