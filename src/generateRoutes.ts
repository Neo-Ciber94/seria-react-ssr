import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import prettier from "prettier";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type FileRoute = {
  id: string;
  routePath: string;
  componentName: string;
};

async function generateRoutes() {
  const routesDir = path.join(__dirname, "routes");
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
    const routePath = path.relative(routesDir, filePath);
    const componentName = generateComponentName(routePath);
    const routeId = routePath
      .replaceAll(path.sep, "/")
      .replaceAll("$", ":")
      .replaceAll(/(.tsx|.jsx|.js)$/g, "")
      .replaceAll(/(index)$/g, "");

    const id = `/${routeId}`;

    routes.push({
      id,
      routePath,
      componentName,
    });
  }

  const imports = routes.map((route) => {
    const importPath = path
      .join("routes", route.routePath)
      .replaceAll(path.sep, "/")
      .replaceAll(/(.tsx|.jsx|.js)$/g, "");

    return `import ${route.componentName} from "./${importPath}";`;
  });

  const routesMap = routes
    .map((r) => `"${r.id}": { id: "${r.id}", Component: ${r.componentName} },`)
    .join("\t\n");

  let code = "";
  code += 'import { createRouter } from "radix3";\n';
  code += imports.join("\n");
  code += "\n\n";
  code += `const router = createRouter<{ id: string, Component: any }>({ routes: { ${routesMap} }})\n\n`;
  code += `export const matchRoute = (pathname: string) => router.lookup(pathname)`;

  const generatedFilePath = path.join(__dirname, "$routes.ts");
  const formattedCode = await prettier.format(code, {
    filepath: generatedFilePath,
  });

  await fs.writeFile(generatedFilePath, formattedCode);
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
    const routesPath = path.join(__dirname, "routes");
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
