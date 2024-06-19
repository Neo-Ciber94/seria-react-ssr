import {
	type ErrorCatcher,
	type Route,
	type ServerAction,
	createRouter,
	createServerActionRouter,
} from "framework/router/routing";
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
				component: layout$0.default,
				loader: (layout$0 as any).loader,
			},
		],
		component: route$0.default,
		loader: (route$0 as any).loader,
	},
	{
		id: "/todos/$id",
		path: "/todos/:id",
		layouts: [
			{
				id: "/_layout",
				path: "/_layout",
				component: layout$0.default,
				loader: (layout$0 as any).loader,
			},
		],
		component: route$1.default,
		loader: (route$1 as any).loader,
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

const router = createRouter(routes);

const actionRouter = createServerActionRouter(actions);

export function matchRoute(id: string) {
	return router.match(id);
}

export const matchErrorCatcher = (id: string): any => {
	console.warn("'matchErrorCatcher' is not implemented yet");
	return null;
};

export const matchServerAction = (id: string) => {
	return actionRouter.match(id);
};
