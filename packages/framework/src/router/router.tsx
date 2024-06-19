import { useCallback, useEffect } from "react";
import { useMemo } from "react";
import { useServerContext } from "../react/context";
import { ErrorPage, NotFound } from "./components";
import { RouteDataProvider, RouteProvider, RouterProvider } from "./contexts";
import { RouteErrorBoundary } from "./error";
import { useMatch, usePathname, useRouteError, useUrl } from "./hooks";
import { NavigationProvider, useNavigation } from "./navigation";
import type { Route } from "./routing";

function Routes() {
	const { pathname, searchParams } = useUrl();
	const { params, match } = useMatch();
	const { navigate } = useNavigation();
	const error = useRouteError();

	useEffect(() => {
		const handlePopState = async (_event: PopStateEvent) => {
			const search = location.search ? `?${location.search}` : "";
			const url = `${location.pathname}${search}`;
			await navigate(url, { updateHistory: false });
		};

		window.addEventListener("popstate", handlePopState);

		return () => {
			window.removeEventListener("popstate", handlePopState);
		};
	}, [navigate]);

	const Component = useCallback(() => {
		if (match?.module.default == null) {
			return <NotFound />;
		}

		return <RouteComponent route={match} />;
	}, [match]);

	return (
		<RouterProvider
			params={params}
			pathname={pathname}
			searchParams={searchParams}
		>
			<RouteErrorBoundary
				key={pathname}
				error={error}
				fallback={() => <ErrorFallback />}
			>
				<Component />
			</RouteErrorBoundary>
		</RouterProvider>
	);
}

function RouteComponent({ route }: { route: Route }) {
	return useMemo(() => {
		let Component = route.module.default;

		Component = (
			<RouteProvider id={route.id} path={route.path}>
				{Component}
			</RouteProvider>
		);

		const layouts = route.layouts || [];
		for (const layout of layouts) {
			const Layout = layout.module.default;
			if (Layout == null) {
				continue;
			}

			Component = (
				<RouteProvider id={layout.id} path={route.path}>
					<Layout>{Component}</Layout>
				</RouteProvider>
			);
		}

		return Component;
	}, [route]);
}

export function Router() {
	return (
		<RouteDataProvider>
			<NavigationProvider>
				<Routes />
			</NavigationProvider>
		</RouteDataProvider>
	);
}

function ErrorFallback() {
	const pathname = usePathname();
	const { errorRouter } = useServerContext();
	const Component = useMemo(() => {
		const match = errorRouter.match(pathname);
		return match?.module.default ?? ErrorPage;
	}, [pathname, errorRouter]);

	return <Component />;
}
