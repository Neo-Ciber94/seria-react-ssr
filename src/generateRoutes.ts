import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import ts from "typescript";
import prettier from "prettier";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROUTES_FOLDER_NAME = "routes";

type FileRoute = {
  id: string;
  routePath: string;
  componentName: string;
};

async function generateRoutes() {
  const routesDir = path.join(__dirname, ROUTES_FOLDER_NAME);
  const files = await fs.readdir(routesDir, {
    recursive: true,
    withFileTypes: true,
  });

  const routes: FileRoute[] = [];

  for (const file of files) {
    if (!file.isFile()) {
      continue;
    }

    const filePath = path.join(file.parentPath, file.name);
    const hasDefaultExport = await isDefaultExportComponent(filePath);
    if (!hasDefaultExport) {
      continue;
    }

    const routePath = path.relative(routesDir, filePath);
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
    });
  }

  const imports = routes.map((route) => {
    const importPath = path
      .join(ROUTES_FOLDER_NAME, route.routePath)
      .replaceAll(path.sep, "/")
      .replaceAll(/(.tsx|.jsx|.js)$/g, "");

    return `import ${route.componentName} from "./${importPath}";`;
  });

  const routesMap = routes
    .map(
      (r) =>
        `"${r.id}": { id: "${r.id}", Component: ${r.componentName}, routePath: ${JSON.stringify(r.routePath)} },`
    )
    .join("\t\n");

  let code = "";
  code += 'import { createRouter } from "radix3";\n';
  code += imports.join("\n");
  code += "\n\n";
  code += `const router = createRouter<{ id: string, Component: any, routePath: string }>({ routes: { ${routesMap} }})\n\n`;
  code += `export const matchRoute = (pathname: string) => router.lookup(pathname)`;

  const generatedFilePath = path.join(__dirname, "$routes.ts");
  const formattedCode = await prettier.format(code, {
    filepath: generatedFilePath,
  });

  await fs.writeFile(generatedFilePath, formattedCode);
}

async function isDefaultExportComponent(filePath: string) {
  const contents = await fs.readFile(filePath, "utf8");
  const source = ts.createSourceFile(
    filePath,
    contents,
    ts.ScriptTarget.ESNext
  );

  return new Promise<boolean>((resolve) => {
    function visit(node: any) {
      if (
        ts.isFunctionDeclaration(node) &&
        node.modifiers &&
        node.modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) &&
        node.modifiers.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)
      ) {
        return resolve(true);
      }

      ts.forEachChild(node, visit);
    }

    visit(source);
  });
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
