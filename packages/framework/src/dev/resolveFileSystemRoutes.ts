import fs from "node:fs";
import path from "node:path";
import { glob } from "glob";
import { normalizePath } from "../plugin/utils";

type GetFileSystemRoutesOptions = {
	cwd?: string;
	ignorePrefix?: string;
	routesDir: string;
};

export async function resolveFileSystemRoutes(
	options: GetFileSystemRoutesOptions,
) {
	let { cwd = process.cwd(), ignorePrefix = "_", routesDir } = options;

	if (!routesDir.endsWith("/")) {
		routesDir += "/";
	}

	const absoluteRoutesDir = path.join(cwd, routesDir);
	console.log(`Reading routes from '${absoluteRoutesDir}'`);

	if (!fs.existsSync(absoluteRoutesDir)) {
		throw new Error(`Routes not found at: '${absoluteRoutesDir}'`);
	}

	const [routeFiles, layoutFiles, actionFiles] = await Promise.all([
		getRouteFiles({ cwd, routesDir, ignorePrefix }),
		getLayoutFiles({ cwd, routesDir, ignorePrefix }),
		getActionFiles({ cwd, routesDir, ignorePrefix }),
	]);

	const code = `
    import { type Route, type ErrorCatcher, type ServerAction, createRouter, createServerActionRouter } from "framework/router/routing";
    ${routeFiles
			.map((routeFile, idx) => {
				const importPath = relativePath(cwd, routeFile).replaceAll(
					/\.(m|c)?(j|t)sx?$/g,
					"",
				);
				return `import * as route$${idx} from "/${importPath}"`;
			})
			.join("\n")}

    ${layoutFiles.map((layoutFile, idx) => {
			const importPath = relativePath(cwd, layoutFile).replaceAll(
				/\.(m|c)?(j|t)sx?$/g,
				"",
			);
			return `import * as layout$${idx} from "/${importPath}"`;
		})}

    ${actionFiles.map((actionFile, idx) => {
			const importPath = relativePath(cwd, actionFile).replaceAll(
				/\.(m|c)?(j|t)sx?$/g,
				"",
			);
			return `import * as actions$${idx} from "/${importPath}"`;
		})}

    export const routes = [
      ${routeFiles
				.map((routeFile, idx) => {
					return `{
          id: ${JSON.stringify(getRouteId(routesDir, routeFile))},
          path: ${JSON.stringify(getRoutePath(routesDir, routeFile))},
          layouts: [${layoutFiles
						.map((f, idx) => [f, idx] as const)
						.filter(([layoutFile]) =>
							isRouteLayoutFile(routesDir, layoutFile, routeFile),
						)
						.map(([layoutFile, idx]) => {
							return `{
                id: ${JSON.stringify(getRouteId(routesDir, layoutFile))},
                path: ${JSON.stringify(getRoutePath(routesDir, layoutFile))},
                component: layout$${idx}.default,
                loader: (layout$${idx} as any).loader
              }`;
						})}
          ],
          component: route$${idx}.default,
          loader: (route$${idx} as any).loader,
        }`;
				})
				.join(",\n")}
    ] satisfies Route[];

    export const errorCatchers : ErrorCatcher[] = [];

    const actions : ServerAction[] = [
    ${actionFiles.map((actionFile, idx) => {
			const actionFilePath = getRoutePath(routesDir, actionFile);
			const actionId = getRouteId(routesDir, actionFile);
			return `...Object.entries(actions$${idx}).map(([actionName, action]) => {
        return {
          id: ${JSON.stringify(actionId)}.concat("#", actionName),
          path:  ${JSON.stringify(actionFilePath)}.concat("#", actionName),
          action
        }
      })`;
		})}
    ];

    const router = createRouter(routes);

    const actionRouter = createServerActionRouter(actions);

    export function matchRoute(id: string) {
      return router.match(id);
    }

    export const matchErrorCatcher = (id: string): any => {
      console.warn("'matchErrorCatcher' is not implemented yet")
      return null;
    };

    export const matchServerAction = (id: string) => {
      return actionRouter.match(id);
    };
  `;

	return code;
}

type GetRouteFilesArgs = {
	cwd: string;
	routesDir: string;
	ignorePrefix: string;
};

async function getRouteFiles(args: GetRouteFilesArgs) {
	const { cwd, routesDir, ignorePrefix } = args;
	const globPattern = `${routesDir}/**/*.{jsx,tsx}`;
	const files = await glob(globPattern, {
		cwd,
		posix: true,
	});

	if (files.length === 0) {
		console.warn(`No routes found in '${globPattern}'`);
	}

	const routeFiles = files.filter((filePath) => {
		return !isIgnored(
			normalizePath(path.relative(cwd, filePath)),
			ignorePrefix,
		);
	});

	if (routeFiles.length !== files.length) {
		const ignoredFiles = files.length - routeFiles.length;
		console.log(`${ignoredFiles} routes where ignored from '${routesDir}'`);
	}

	console.log(`${routeFiles.length} routes where found at '${routesDir}'`);

	// Check if all routes are valid
	routeFiles.forEach((filePath) => checkIsValidRoute(routesDir, filePath));

	return routeFiles;
}

async function getLayoutFiles(args: GetRouteFilesArgs) {
	const { cwd, routesDir, ignorePrefix } = args;
	const globPattern = `${routesDir}/**/_layout.{jsx,tsx}`;
	const files = await glob(globPattern, {
		cwd,
		posix: true,
	});

	if (files.length === 0) {
		console.warn(`No layouts found in '${globPattern}'`);
	}

	const layoutFiles = files.filter((filePath) => {
		// We only check if ignored only from the directory because the `_layout` file will be ignored otherwise because its prefix
		const layoutPath = path.relative(cwd, path.dirname(filePath));
		return !isIgnored(normalizePath(layoutPath), ignorePrefix);
	});

	if (layoutFiles.length !== files.length) {
		const ignoredFiles = files.length - layoutFiles.length;
		console.log(`${ignoredFiles} layouts where ignored from '${routesDir}'`);
	}

	console.log(`${layoutFiles.length} layouts where found at '${routesDir}'`);

	// Check if all layouts are valid
	layoutFiles.forEach((filePath) => checkIsValidRoute(routesDir, filePath));

	return layoutFiles;
}

async function getActionFiles(args: GetRouteFilesArgs) {
	const { cwd, routesDir, ignorePrefix } = args;
	const globPattern = `${routesDir}/**/_actions.{js,ts,cjs,mjs,jsx,tsx}`;
	const files = await glob(globPattern, {
		cwd,
		posix: true,
	});

	if (files.length === 0) {
		console.warn(`No actions found in '${globPattern}'`);
	}

	const actionFiles = files.filter((filePath) => {
		// We only check if ignored only from the directory because the `_actions` file will be ignored otherwise because its prefix
		const actionPath = path.relative(cwd, path.dirname(filePath));
		return !isIgnored(normalizePath(actionPath), ignorePrefix);
	});

	if (actionFiles.length !== files.length) {
		const ignoredFiles = files.length - actionFiles.length;
		console.log(`${ignoredFiles} actions where ignored from '${routesDir}'`);
	}

	console.log(`${actionFiles.length} actions where found at '${routesDir}'`);

	return actionFiles;
}

function isRouteLayoutFile(
	routesDir: string,
	layoutFile: string,
	routeFile: string,
) {
	const normalizedLayoutFile = path.resolve(routesDir, layoutFile);
	const normalizedRouteFile = path.resolve(routesDir, routeFile);

	const layoutDir = path.dirname(normalizedLayoutFile);

	if (path.dirname(normalizedRouteFile) === layoutDir) {
		return true;
	}

	const relativePath = path.relative(layoutDir, normalizedRouteFile);

	return !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}

function relativePath(cwd: string, filePath: string) {
	return normalizePath(path.relative(cwd, filePath));
}

function isIgnored(relativeFilePath: string, ignorePrefix: string) {
	return relativeFilePath.split("/").some((f) => f.startsWith(ignorePrefix));
}

function getRouteId(routesDir: string, filePath: string) {
	const normalized = normalizePath(path.relative(routesDir, filePath));
	const routePath = normalized
		.replaceAll(path.sep, "/")
		.replaceAll(/\.(c|m)?(j|t)sx?$/g, "");
	return `/${routePath}`;
}

function getRoutePath(routesDir: string, filePath: string) {
	const normalized = normalizePath(path.relative(routesDir, filePath));
	const routeId = normalized
		.replaceAll("$$", "**:")
		.replaceAll("$", ":")
		.replaceAll(/\.(js|ts|jsx|tsx)$/g, "")
		.replaceAll(/(index)$/g, "");

	return `/${normalizePath(routeId)}`;
}

function checkIsValidRoute(routesDir: string, filePath: string) {
	function isValidRouteSegment(segment: string) {
		const s = segment.trim();

		if (s.length === 0) {
			return false;
		}

		if (s.startsWith("$")) {
			return s.slice(1).length > 0;
		}

		return true;
	}

	const id = getRoutePath(routesDir, filePath);
	const segments = id.split("/").filter(Boolean);
	const isValidRoute = segments
		.map((s) => s.replaceAll("**:", "$$"))
		.map((s) => s.replaceAll(":", "$"))
		.every(isValidRouteSegment);

	if (!isValidRoute) {
		throw new Error(
			`Invalid route: '${normalizePath(path.join(routesDir, filePath))}'`,
		);
	}
}
