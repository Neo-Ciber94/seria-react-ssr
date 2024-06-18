import type React from "react";
import { useContext, useState } from "react";
import { createContext, type PropsWithChildren } from "react";
import { type AppContext, useServerContext } from "../react/context";
import type { Params } from "./routing";

type RouterContextProps = {
	params: Params;
	pathname: string;
	searchParams: URLSearchParams;
};

const RouterContext = createContext<RouterContextProps | null>(null);

export function RouterProvider({
	children,
	...rest
}: PropsWithChildren<RouterContextProps>) {
	return (
		<RouterContext.Provider value={rest}>{children}</RouterContext.Provider>
	);
}

export function useRouterContext() {
	const ctx = useContext(RouterContext);

	if (!ctx) {
		throw new Error("RouterContext is not available");
	}

	return ctx;
}

const RouteContext = createContext<RouteProviderProps | null>(null);

type RouteProviderProps = {
	id: string;
	path: string;
};

export function RouteProvider(props: PropsWithChildren<RouteProviderProps>) {
	return (
		<RouteContext.Provider value={{ id: props.id, path: props.path }}>
			{props.children}
		</RouteContext.Provider>
	);
}

export function useRouteContext() {
	const route = useContext(RouteContext);

	if (!route) {
		throw new Error("RouteContext was not available");
	}

	return route;
}

type RouterDataProps = {
	routeData: AppContext;
	setRouteData: (ctx: React.SetStateAction<AppContext>) => void;
};

const RouterDataContext = createContext<RouterDataProps | null>(null);

export function RouteDataProvider(props: { children: React.ReactNode }) {
	const { appContext } = useServerContext();
	const [routeData, setRouteData] = useState(appContext);

	return (
		<RouterDataContext.Provider value={{ routeData, setRouteData }}>
			{props.children}
		</RouterDataContext.Provider>
	);
}

export function useRouteDataContext() {
	const ctx = useContext(RouterDataContext);

	if (!ctx) {
		throw new Error("RouterDataContext is not available");
	}

	return ctx;
}
