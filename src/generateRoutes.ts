import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import prettier from "prettier";
import { glob } from "glob";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROUTES_FOLDER_NAME = "routes";
const ROUTES_FILE_PATH = path.join(__dirname, "$routes.ts");

type RouteFile = {
  id: string;
  routePath: string;
  componentName: string;
  component?: Function;
  loader?: Function;
};

type ErrorFile = {
  id: string;
  routePath: string;
  componentName: string;
  component?: Function;
};

type ActionFile = {
  id: string;
  actionPath: string;
  functionName: string;
  action?: (...args: any[]) => Promise<any>;
};

const ROUTES_TEMPLATE = `
export const matchRoute = (pathname: string): any => {
  throw new Error('Not implemented')
}

export const matchErrorRoute = (pathname: string): any => {
  throw new Error('Not implemented')
}

export const matchAction = (id: string): any => {
  throw new Error('Not implemented')
}
`;

async function generateRoutes() {
  const routesDir = path.join(__dirname, ROUTES_FOLDER_NAME);

  // We wipe or recreate the $routes.ts to prevent import errors
  await fs.writeFile(ROUTES_FILE_PATH, ROUTES_TEMPLATE);

  const [routes, errorRoutes, actions] = await Promise.all([
    getFileRoutes(routesDir),
    getErrorRoutes(routesDir),
    getServerActions(routesDir),
  ]);

  const code = await generateRouterCode(routes, errorRoutes, actions);
  await fs.writeFile(ROUTES_FILE_PATH, code);
}

async function generateRouterCode(
  routes: RouteFile[],
  errorRoutes: ErrorFile[],
  actions: ActionFile[]
) {
  const routeImports = routes.map((r, i) => {
    const importPath = path
      .join(ROUTES_FOLDER_NAME, r.routePath)
      .replaceAll(path.sep, "/")
      .replaceAll(/(.tsx|.jsx|.js)$/g, "");

    const additionalImports: string[] = [];

    if (r.loader) {
      additionalImports.push(`loader as loader$${i}`);
    }

    const routeImports = additionalImports
      ? `,{ ${additionalImports.join(",")} }`
      : "";

    return `import ${r.componentName} ${routeImports} from "./${importPath}";`;
  });

  const errorRouteImports = errorRoutes.map((r, i) => {
    const importPath = path
      .join(ROUTES_FOLDER_NAME, r.routePath)
      .replaceAll(path.sep, "/")
      .replaceAll(/(.tsx|.jsx|.js)$/g, "");

    return `import ${r.componentName} from "./${importPath}";`;
  });

  const actionsRouteImport = actions.map((r, i) => {
    const importPath = path
      .join(ROUTES_FOLDER_NAME, r.actionPath)
      .replaceAll(path.sep, "/")
      .replaceAll(/.(js|ts|jsx|tsx)$/g, "");

    return `import { ${r.functionName} as action$${i} } from "./${importPath}";`;
  });

  const routesMap = routes
    .map((r, i) => {
      const loader = r.loader ? `loader$${i}` : "undefined";

      return `"${r.id}": { 
        id: "${r.id}", 
        component: ${r.componentName}, 
        routePath: ${JSON.stringify(r.routePath)},
        loader: ${loader}
      },`;
    })
    .join("\t\n");

  const errorRoutesMap = errorRoutes
    .map((r) => {
      return `"${r.id}": { 
        id: "${r.id}", 
        component: ${r.componentName}, 
        routePath: ${JSON.stringify(r.routePath)},
      },`;
    })
    .join("\t\n");

  const actionsMap = actions
    .map((r, i) => {
      return `"${r.id}": { 
        id: "${r.id}", 
        actionPath: ${JSON.stringify(r.actionPath)}, 
        action:  action$${i},
      },`;
    })
    .join("\t\n");

  const code = `
    import { createRouter } from "radix3";
    ${routeImports.join("\n")}
    ${errorRouteImports.join("\n")}
    ${actionsRouteImport.join("\n")}

    interface Route {
      id: string,
      routePath: string
      component?: () => any,
      loader?: (...args: any[]) => any | Promise<any>,
    }

    interface ErrorRoute {
      id: string;
      routePath: string;
      component: () => any;
    }

    interface Action {
      id: string;
      actionPath: string;
      functionName: string;
      action: (...args: any[]) => Promise<any>
    }

    const router = createRouter<Route>({ routes: { ${routesMap} }});

    const errorRouter = createRouter<ErrorRoute>({ routes: { ${errorRoutesMap} }});

    const actionRouter = createRouter<Action>({ routes: { ${actionsMap} }});

    export const matchRoute = (pathname: string) => router.lookup(pathname);

    export const matchErrorRoute = (pathname: string) => errorRouter.lookup(pathname);

    export const matchAction = (id: string) => actionRouter.lookup(id);
  `;

  const formatted = await prettier.format(code, {
    filepath: ROUTES_FILE_PATH,
  });

  return formatted;
}

async function getFileRoutes(routesDir: string) {
  const routes: RouteFile[] = [];

  const files = await fs.readdir(routesDir, {
    recursive: true,
    withFileTypes: true,
  });

  for (const file of files) {
    if (!file.isFile()) {
      continue;
    }

    const filePath = path.join(file.parentPath, file.name);
    const isIgnored = await isIgnoredFilePath(routesDir, filePath);
    if (isIgnored) {
      continue;
    }

    const routePath = path.relative(routesDir, filePath);
    const routeExports = await getRouteExports(routePath);

    if (routeExports == null || routeExports.component == null) {
      continue;
    }

    const componentName = generateComponentName(routePath);
    const routeId = routePath
      .replaceAll(path.sep, "/")
      .replaceAll("$$", "**:")
      .replaceAll("$", ":")
      .replaceAll(/(.tsx|.jsx|.js)$/g, "")
      .replaceAll(/(index)$/g, "");

    const id = `/${routeId}`;
    const segments = id.split("/").filter(Boolean);
    const isValidRoute = segments
      .map((s) => s.replaceAll("**:", "$$"))
      .map((s) => s.replaceAll(":", "$"))
      .every(isValidRouteSegment);

    if (!isValidRoute) {
      throw new Error(
        `Invalid route: '${path.join(ROUTES_FOLDER_NAME, routePath)}'`
      );
    }

    routes.push({
      id,
      routePath,
      componentName,
      component: routeExports.component,
      loader: routeExports.loader,
    });
  }

  return routes;
}

async function getErrorRoutes(routesDir: string) {
  const errorRoutes: ErrorFile[] = [];
  const errorFiles = await glob([`${routesDir}/**/_error.{js,jsx,tsx}`], {
    dotRelative: true,
    posix: true,
  });

  for (const file of errorFiles) {
    const routePath = path.relative(routesDir, file);
    const importPath = path
      .join(ROUTES_FOLDER_NAME, routePath)
      .replaceAll(path.sep, "/");

    const mod = await import(`./${importPath}`).catch(() => null);
    if (mod == null) {
      continue;
    }

    const { default: component } = mod;

    if (component == null) {
      continue;
    }

    if (typeof component !== "function") {
      throw new Error(
        `Error page do not default export a component: ${routePath}`
      );
    }

    const componentName = generateComponentName(routePath).replaceAll("_", "$");
    const routeId = routePath
      .replaceAll(path.sep, "/")
      .replace(/_error\.(js|jsx|tsx)$/g, "**");

    const id = `/${routeId}`;
    errorRoutes.push({
      id,
      routePath,
      componentName,
      component,
    });
  }

  return errorRoutes;
}

async function getServerActions(routesDir: string) {
  const actions: ActionFile[] = [];

  const files = await glob(`${routesDir}/**/_actions.{js,jsx,ts,tsx}`, {
    dotRelative: true,
    posix: true,
  });

  for (const file of files) {
    const actionPath = path.relative(routesDir, file);
    const importPath = path
      .join(ROUTES_FOLDER_NAME, actionPath)
      .replaceAll(path.sep, "/");

    const mod = await import(`./${importPath}`).catch(() => null);
    if (mod == null) {
      continue;
    }

    for (const [ident, item] of Object.entries(mod)) {
      if (typeof item !== "function") {
        throw new Error("Server actions can only be functions");
      }

      const actionId = actionPath.replaceAll(/.(js|jsx|ts|tsx)/g, "");
      const id = `${actionId}#${ident}`;
      actions.push({
        id,
        actionPath,
        action: item as any,
        functionName: ident,
      });
    }
  }

  return actions;
}

async function getRouteExports(routePath: string) {
  const importPath = `./${ROUTES_FOLDER_NAME}/${routePath}`;
  const mod = await import(importPath).catch(() => null);

  if (!mod) {
    return null;
  }

  const { default: component, loader } = mod;

  if (component && typeof component !== "function") {
    throw new Error(`exported component should be a function: ${routePath}`);
  }

  if (loader && typeof component !== "function") {
    throw new Error(`exported loader should be a function: ${routePath}`);
  }

  return { component, loader };
}

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

async function isIgnoredFilePath(routesDir: string, filePath: string) {
  const fileName = path.basename(filePath);

  if (fileName.startsWith("_")) {
    return true;
  }

  return path
    .relative(routesDir, filePath)
    .replaceAll(path.sep, "/")
    .split("/")
    .filter(Boolean)
    .some((s) => s.startsWith("_"));
}

function generateComponentName(filePath: string) {
  const parts = filePath
    .replaceAll(/(.tsx|.jsx|.js)$/g, "")
    .replaceAll("\\", "/")
    .split("/")
    .filter(Boolean);

  function capizalize(name: string) {
    return name
      .split(" ")
      .filter(Boolean)
      .map((s) => s[0].toUpperCase() + s.slice(1).toLowerCase())
      .join("");
  }

  return parts.map(capizalize).join("") + "Page";
}

async function main() {
  await generateRoutes();
}

main().catch(console.error);
