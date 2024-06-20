import type { Route, ErrorCatcher, ServerAction } from "framework/router/routing";
import RootComponent from "/src/app";

import * as route$0 from "/src/routes/index";
import * as route$1 from "/src/routes/todos/$id";

import * as layout$0 from "/src/routes/_layout";

import * as actions$0 from "/src/routes/_actions";

export const routes = [
	{
		id: "/index",
		path: "/",
		layouts: [
			{
				id: "/_layout",
				path: "/_layout",
				module: layout$0,
			},
		],
		module: route$0,
	},
	{
		id: "/todos/$id",
		path: "/todos/:id",
		layouts: [
			{
				id: "/_layout",
				path: "/_layout",
				module: layout$0,
			},
		],
		module: route$1,
	},
] satisfies Route[];

export const errorCatchers: ErrorCatcher[] = [];

const actions: ServerAction[] = [
	...Object.entries(actions$0).map(([actionName, action]) => {
		return {
			id: "/_actions".concat("#", actionName),
			path: "/_actions".concat("#", actionName),
			action,
		};
	}),
];

export const routesDir = "./src/routes/";
export default RootComponent;
