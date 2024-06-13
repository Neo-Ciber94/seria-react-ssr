import path from "path";
import { glob } from "glob";
import { normalizePath } from "../internal";
import * as prettier from "prettier";
import fs from "fs";

type GetFileSystemRoutesOptions = {
  cwd?: string;
  ignorePrefix?: string;
  routesDir: string;
};

export async function resolveFileSystemRoutes(options: GetFileSystemRoutesOptions) {
  let { cwd = process.cwd(), ignorePrefix = "_", routesDir } = options;

  if (!routesDir.endsWith("/")) {
    routesDir += "/";
  }

  const absoluteRoutesDir = path.join(cwd, routesDir);
  console.log(`Reading routes from '${absoluteRoutesDir}'`);

  if (!fs.existsSync(absoluteRoutesDir)) {
    throw new Error(`Routes not found at: '${absoluteRoutesDir}'`);
  }

  const globPattern = `${routesDir}/**/*.{jsx,tsx}`;
  const files = await glob(globPattern, {
    cwd,
    posix: true,
  });

  if (files.length === 0) {
    console.warn(`No routes found in '${globPattern}'`);
  }

  const routeFiles = files.filter((filePath) => {
    return !isIgnored(normalizePath(path.relative(cwd, filePath)), ignorePrefix);
  });

  if (routeFiles.length !== files.length) {
    const ignoredFiles = files.length - routeFiles.length;
    console.log(`${ignoredFiles} routes where ignored from '${routesDir}'`);
  }

  console.log(`${routeFiles.length} routes where found at '${routesDir}'`);

  // Check if all routes are valid
  routeFiles.forEach((filePath) => checkIsValidRoute(routesDir, filePath));

  const code = `
    import { type Route, createRouter } from "framework/router/routing";
    ${routeFiles
      .map((routeFile, idx) => {
        return `import * as route$${idx} from "../../${relativePath(cwd, routeFile)}"`;
      })
      .join("\n")}

    const routes = [
      ${routeFiles
        .map((routeFile, idx) => {
          return `{
          id: ${JSON.stringify(getRouteId(routesDir, routeFile))},
          routePath: ${JSON.stringify(getRoutePath(routesDir, routeFile))},
          layouts: [],
          component: route$${idx}.default,
          loader: (route$${idx} as any).loader,
        }`;
        })
        .join(",\n")}
    ] satisfies Route[];

    const router = createRouter(routes);

    export function matchRoute(id: string) {
      return router.match(id);
    }

    export const matchErrorCatcher = (id: string): any => {
      throw new Error("Not implemented");
    };

    export const matchServerAction = (id: string): any => {
      throw new Error("Not implemented");
    };
  `;

  return prettier.format(code, { filepath: "$routes.ts" });
}

function relativePath(cwd: string, filePath: string) {
  return normalizePath(path.relative(cwd, filePath));
}

function isIgnored(relativeFilePath: string, ignorePrefix: string) {
  return relativeFilePath.split("/").some((f) => f.startsWith(ignorePrefix));
}

function getRouteId(routesDir: string, filePath: string) {
  const normalized = normalizePath(path.relative(routesDir, filePath));
  const routePath = normalized.replaceAll(path.sep, "/").replaceAll(/\.(js|ts|jsx|tsx)$/g, "");
  return `/${routePath}`;
}

function getRoutePath(routesDir: string, filePath: string) {
  const normalized = normalizePath(path.relative(routesDir, filePath));
  const routeId = normalized
    .replaceAll("$$", "**:")
    .replaceAll("$", ":")
    .replaceAll(/\.(js|ts|jsx|tsx)$/g, "")
    .replaceAll(/(index)$/g, "");

  return "/" + normalizePath(routeId);
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
    throw new Error(`Invalid route: '${normalizePath(path.join(routesDir, filePath))}'`);
  }
}
