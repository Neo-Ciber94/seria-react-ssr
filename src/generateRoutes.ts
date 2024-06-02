import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import prettier from "prettier";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROUTES_FOLDER_NAME = "routes";
const GENERATED_FILE_PATH = path.join(__dirname, "$routes.ts");

type RouteEntry = {
  id: string;
  routePath: string;
  componentName: string;
  component?: Function;
  loader?: Function;
};

async function generateRoutes() {
  const routesDir = path.join(__dirname, ROUTES_FOLDER_NAME);

  const files = await fs.readdir(routesDir, {
    recursive: true,
    withFileTypes: true,
  });

  // We add a dummy export because some routes throw due $routes.tsx `matchRoute` not being defined
  await fs.writeFile(
    GENERATED_FILE_PATH,
    `export const matchRoute = (pathname: string) => {
      throw new Error('Not implemented')
    }`
  );

  const routes: RouteEntry[] = [];

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

  const code = await generateRouterCode(routes);
  await fs.writeFile(GENERATED_FILE_PATH, code);
}

async function generateRouterCode(routes: RouteEntry[]) {
  const imports = routes.map((r, i) => {
    const importPath = path
      .join(ROUTES_FOLDER_NAME, r.routePath)
      .replaceAll(path.sep, "/")
      .replaceAll(/(.tsx|.jsx|.js)$/g, "");

    const additionalImports: string[] = [];

    if (r.loader) {
      additionalImports.push(`loader as loader$${i + 1}`);
    }

    const routeImports = additionalImports
      ? `,{ ${additionalImports.join(",")} }`
      : "";

    return `import ${r.componentName} ${routeImports} from "./${importPath}";`;
  });

  const routesMap = routes
    .map((r, i) => {
      const loader = r.loader ? `loader$${i + 1}` : "undefined";

      return `"${r.id}": { 
        id: "${r.id}", 
        component: ${r.componentName}, 
        routePath: ${JSON.stringify(r.routePath)},
        loader: ${loader}
      },`;
    })
    .join("\t\n");

  let code = "";
  code += 'import { createRouter } from "radix3";\n';
  code += imports.join("\n");
  code += `\n
    interface Route {
      id: string,
      routePath: string
      component?: () => any,
      loader?: (...args: any[]) => any | Promise<any>,
    }
  `;
  code += "\n\n";
  code += `const router = createRouter<Route>({ routes: { ${routesMap} }})\n\n`;
  code += `export const matchRoute = (pathname: string) => router.lookup(pathname)`;

  const formatted = await prettier.format(code, {
    filepath: GENERATED_FILE_PATH,
  });

  return formatted;
}

async function getRouteExports(routePath: string) {
  const mod = await import(`./${ROUTES_FOLDER_NAME}/${routePath}`);

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
  const isWatch = Boolean(process.env.WATCH);

  if (isWatch) {
    const routesPath = path.join(__dirname, ROUTES_FOLDER_NAME);
    const changes = fs.watch(routesPath, { recursive: true });
    for await (const _ of changes) {
      try {
        await generateRoutes();
      } catch (err) {
        console.error(err);
      }
    }
  } else {
    await generateRoutes();
  }
}

main().catch(console.error);
