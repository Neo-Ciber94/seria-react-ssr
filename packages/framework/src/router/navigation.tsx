import type React from "react";
import { useState, useCallback, createContext, useContext } from "react";
import {
	HEADER_LOADER_DATA,
	HEADER_SERIA_STREAM,
	HEADER_ROUTE_REDIRECT,
	HEADER_ROUTE_ERROR,
} from "../constants";
import type { AppContext } from "../react";
import { useRouteDataContext } from "./contexts";
import * as seria from "seria";
import { HttpError } from "../server/http";

type NavigationStatus = "pending" | "error" | "loaded";

type NavigateOptions = {
	replace?: boolean;
	updateHistory?: boolean;
};

type NavigationContextProps = {
	navigationStatus: NavigationStatus;
	refresh: () => Promise<void>;
	navigate: (
		url: string,
		options?: { replace?: boolean; updateHistory?: boolean },
	) => Promise<void>;
};

const NavigationContext = createContext<NavigationContextProps | null>(null);

const MAX_REDIRECTS = 10;

type RouteDataResult =
	| { type: "redirect"; to: string }
	| { type: "success"; data: AppContext }
	| undefined;

async function fetchRoute(url: string): Promise<RouteDataResult> {
	const response = await fetch(url, {
		headers: {
			[HEADER_LOADER_DATA]: "1",
		},
	});

	// Data
	if (response.headers.has(HEADER_SERIA_STREAM)) {
		if (!response.body) {
			throw new Error("Response body was empty");
		}

		const stream = response.body.pipeThrough(new TextDecoderStream());
		const context = await seria.parseFromStream(stream);

		return {
			type: "success",
			data: context as AppContext,
		};
	}
	// Redirect
	else if (response.headers.has(HEADER_ROUTE_REDIRECT)) {
		const to = response.headers.get(HEADER_ROUTE_REDIRECT) ?? "/";
		return { type: "redirect", to };
	}
	// Error
	else if (!response.ok) {
		if (
			response.headers.has(HEADER_ROUTE_ERROR) &&
			response.headers.get("content-type") === "text/plain"
		) {
			const message = await response.text();
			throw new HttpError(response.status, message);
		}

		throw new Error("Navigation error");
	} else {
		return undefined;
	}
}

function isExternalUrl(url: string) {
	const isAbsolute = /^https?:\/\//i.test(url);

	if (isAbsolute) {
		const { origin } = new URL(url);
		return origin !== location.origin;
	}

	return false;
}

export function NavigationProvider({
	children,
}: { children: React.ReactNode }) {
	const [navigationError, setNavigationError] = useState<Error>();
	const [navigationStatus, setNavigationStatus] =
		useState<NavigationStatus>("loaded");
	const { routeData, setRouteData } = useRouteDataContext();
	const url = routeData.url;

	if (navigationError) {
		throw navigationError;
	}

	const navigateToUrl = useCallback(
		async (url: string, redirectCount: number, options?: NavigateOptions) => {
			const { replace = false, updateHistory = true } = options || {};

			if (isExternalUrl(url)) {
				window.location.href = url;
			}

			let hasError = false;

			try {
				if (redirectCount >= MAX_REDIRECTS) {
					throw new Error("Too many redirects");
				}

				setNavigationStatus("pending");
				const result = await fetchRoute(url);

				if (!result) {
					return;
				}

				switch (result.type) {
					case "success": {
						const { data } = result;

						if (updateHistory) {
							if (replace) {
								history.replaceState({}, "", data.url);
							} else {
								history.pushState({}, "", data.url);
							}
						}

						setRouteData(data);
						break;
					}
					case "redirect": {
						// If the url is absolute, we send the user outside the app
						if (isExternalUrl(result.to)) {
							window.location.href = result.to;
						} else {
							navigateToUrl(result.to, redirectCount + 1, options);
						}
						break;
					}
				}
			} catch (err) {
				hasError = true;

				if (err instanceof Error) {
					setNavigationError(err);
				}

				setNavigationStatus("error");
			} finally {
				if (!hasError) {
					setNavigationStatus("loaded");
				}
			}
		},
		[setRouteData],
	);

	const navigate = useCallback(
		async (url: string, options?: NavigateOptions) => {
			return navigateToUrl(url, 0, options);
		},
		[navigateToUrl],
	);

	const refresh = useCallback(() => navigate(url), [navigate, url]);

	return (
		<NavigationContext.Provider
			value={{
				navigationStatus,
				navigate,
				refresh,
			}}
		>
			{children}
		</NavigationContext.Provider>
	);
}

export function useNavigation() {
	const ctx = useContext(NavigationContext);

	if (!ctx) {
		throw new Error("NavigationContext is not available");
	}

	return ctx;
}
