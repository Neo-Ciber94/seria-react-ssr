import fs from "fs/promises";
import fse from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import prettier from "prettier";
import { glob } from "glob";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const __filename = path.basename(fileURLToPath(import.meta.url));
const ROUTES_FOLDER_NAME = "routes";
const ROUTES_FILE_PATH = path.join(__dirname, "$routes.ts");
const ROUTES_DIR_PATH = path.join(__dirname, ROUTES_FOLDER_NAME);

type RouteLayoutFile = {
  id: string;
  layoutPath: string;
  componentName: string;
  component: Function;
  loader?: Function;
};

type RouteFile = {
  id: string;
  routePath: string;
  componentName: string;
  component?: Function;
  loader?: Function;
  layouts?: RouteLayoutFile[];
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

  await fse.ensureDir(routesDir);

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
  const layoutsMap = new Map<string, RouteLayoutFile>();

  for (const route of routes) {
    for (const layout of route.layouts || []) {
      layoutsMap.set(layout.id, layout);
    }
  }

  const routeImports = routes.map((r, i) => {
    const importPath = path
      .join(ROUTES_FOLDER_NAME, r.routePath)
      .replaceAll(path.sep, "/")
      .replaceAll(/\.(js|ts|jsx|tsx)$/g, "");

    const additionalImports: string[] = [];

    if (r.loader) {
      additionalImports.push(`loader as loader$${i}`);
    }

    const routeImports = additionalImports
      ? `,{ ${additionalImports.join(",")} }`
      : "";

    return `import ${r.componentName} ${routeImports} from "./${importPath}";`;
  });

  const errorRouteImports = errorRoutes.map((r) => {
    const importPath = path
      .join(ROUTES_FOLDER_NAME, r.routePath)
      .replaceAll(path.sep, "/")
      .replaceAll(/\.(js|ts|jsx|tsx)$/g, "");

    return `import ${r.componentName} from "./${importPath}";`;
  });

  const actionsRouteImport = actions.map((r, i) => {
    const importPath = path
      .join(ROUTES_FOLDER_NAME, r.actionPath)
      .replaceAll(path.sep, "/")
      .replaceAll(/\.(js|ts|jsx|tsx)$/g, "");

    return `import { ${r.functionName} as action$${i} } from "./${importPath}";`;
  });

  const layoutImports = Array.from(layoutsMap.values()).map((l) => {
    const importPath = path
      .join(ROUTES_FOLDER_NAME, l.layoutPath)
      .replaceAll(path.sep, "/")
      .replaceAll(/\.(js|ts|jsx|tsx)$/g, "");

    const additionalImports: string[] = [];

    if (l.loader) {
      additionalImports.push(`loader as ${l.componentName}_loader`);
    }

    const layoutImports = additionalImports
      ? `,{ ${additionalImports.join(",")} }`
      : "";

    return `import ${l.componentName} ${layoutImports} from "./${importPath}";`;
  });

  const routesMap = routes
    .map((r, i) => {
      const loader = r.loader ? `loader$${i}` : "undefined";
      const layouts = (r.layouts || []).map((l) => {
        const loader = l.loader ? `${l.componentName}_loader` : "undefined";

        return `
          {
            id: "${l.id}",
            layoutPath: ${JSON.stringify(l.layoutPath)},
            component: ${l.componentName},
            loader: ${loader}
          }`;
      });

      return `"${r.id}": { 
        id: "${r.id}", 
        component: ${r.componentName}, 
        routePath: ${JSON.stringify(r.routePath)},
        loader: ${loader},
        layouts: [${layouts.join(",")}]
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
    // file generated by '${__filename}'
    
    import { createRouter } from "radix3";
    ${routeImports.join("\n")}
    ${layoutImports.join("\n")}
    ${errorRouteImports.join("\n")}
    ${actionsRouteImport.join("\n")}

    export interface Layout {
      id: string;
      layoutPath: string;
      component?: (props: { children: any }) => any,
      loader?: (...args: any[]) => any | Promise<any>,
    }

    export interface Route {
      id: string,
      routePath: string
      component?: () => any,
      loader?: (...args: any[]) => any | Promise<any>,
      layouts?: Layout[]
    }

    export interface ErrorRoute {
      id: string;
      routePath: string;
      component: () => any;
    }

    export interface ServerAction {
      id: string;
      actionPath: string;
      functionName: string;
      action: (...args: any[]) => Promise<any>
    }

    const router = createRouter<Route>({ routes: { ${routesMap} }});

    const errorRouter = createRouter<ErrorRoute>({ routes: { ${errorRoutesMap} }});

    const actionRouter = createRouter<ServerAction>({ routes: { ${actionsMap} }});

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

  const files = await glob([`${routesDir}/**/*.{js,ts,jsx,tsx}`], {
    dotRelative: true,
    posix: true,
  });

  for (const filePath of files) {
    const isIgnored = await isIgnoredFilePath(routesDir, filePath);
    if (isIgnored) {
      continue;
    }

    const routeFilePath = path.relative(routesDir, filePath);
    const routeExports = await getRouteExports(routeFilePath);

    if (routeExports == null || routeExports.component == null) {
      continue;
    }

    const componentName = generateComponentName(routeFilePath);
    const routeId = routeFilePath
      .replaceAll(path.sep, "/")
      .replaceAll("$$", "**:")
      .replaceAll("$", ":")
      .replaceAll(/\.(js|ts|jsx|tsx)$/g, "")
      .replaceAll(/(index)$/g, "");

    const id = `/${routeId}`;
    const segments = id.split("/").filter(Boolean);
    const isValidRoute = segments
      .map((s) => s.replaceAll("**:", "$$"))
      .map((s) => s.replaceAll(":", "$"))
      .every(isValidRouteSegment);

    if (!isValidRoute) {
      throw new Error(
        `Invalid route: '${path.join(ROUTES_FOLDER_NAME, routeFilePath)}'`
      );
    }

    const layouts = await getRouteLayouts(routeFilePath);
    const normalizedRoutePath = routeFilePath
      .replaceAll(path.sep, "/")
      .replaceAll(/\.(js|ts|jsx|tsx)$/g, "");

    const routePath = `/${normalizedRoutePath}`;

    routes.push({
      id,
      routePath,
      componentName,
      component: routeExports.component,
      loader: routeExports.loader,
      layouts,
    });
  }

  return routes;
}

async function getRouteLayouts(routePath: string) {
  const layouts: RouteLayoutFile[] = [];
  const extensions = ["js", "ts", "tsx", "jsx"];

  const filePath = path.join(ROUTES_DIR_PATH, routePath);
  const root = path.dirname(ROUTES_DIR_PATH);
  let dir = path.dirname(filePath);

  while (dir != root) {
    const layoutPaths = extensions.map((ext) =>
      path.join(dir, `_layout.${ext}`)
    );

    const layoutFile = layoutPaths.find((f) => fse.existsSync(f));

    if (layoutFile) {
      const layoutFilePath = path.relative(ROUTES_DIR_PATH, layoutFile);

      const mod = await getRouteExports(layoutFilePath);

      if (!mod) {
        continue;
      }

      const { component, loader } = mod;
      const componentName = generateComponentName(layoutFilePath);
      const layoutId = layoutFilePath
        .replaceAll(path.sep, "/")
        .replaceAll(/\.(js|ts|jsx|tsx)$/g, "")
        .replaceAll(/_layout$/g, "");

      const id = `/${layoutId}`;
      const normalizedlayoutPath = layoutFilePath
        .replaceAll(path.sep, "/")
        .replaceAll(/\.(js|ts|jsx|tsx)$/g, "");

      const layoutPath = `/${normalizedlayoutPath}`;

      layouts.push({
        id,
        componentName,
        layoutPath,
        component,
        loader,
      });
    }

    dir = path.dirname(dir);
  }

  return layouts;
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
      .replace(/_error\.(ts|js|jsx|tsx)$/g, "**");

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

      const actionId = actionPath.replaceAll(/\.(js|jsx|ts|tsx)/g, "");
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
    .replaceAll(/\.(js|ts)x?$/g, "")
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
