import { defineConfig, PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { createClientServerActionProxyFromPath } from "./esbuild/createClientServerActionProxy";
import { removeServerExportsFromSource } from "./esbuild/removeServerExports";
import { getLoader } from "./esbuild/utils";
import path from "path";
import fs from "fs/promises";

const routesDir = path.join(process.cwd(), "src/routes").replaceAll(path.sep, "/");

function isInRoutes(filePath: string) {
  return filePath.startsWith(routesDir);
}

export default defineConfig((config) => {
  console.log(config);
  return {
    plugins: [react(), tsconfigPaths(), frameworkPlugin()],
    optimizeDeps: {
      entries: ["react", "react/jsx-runtime", "react/jsx-dev-runtime", "react-dom/client"],
    },
    build: {
      manifest: true,
      minify: false,
      rollupOptions: {
        input: ["./src/entry.client.tsx"],
        output: {
          format: "es",
          manualChunks(id) {
            if (isInRoutes(id)) {
              const chunkName = path
                .relative(routesDir, id)
                .replaceAll(path.sep, "/")
                .replaceAll("/", "_")
                .replaceAll(/\.(j|t)sx?$/g, "");

              return `routes_${chunkName}`;
            }

            const dir = path.relative(process.cwd(), id).replaceAll(path.sep, "/");
            if (dir.startsWith("node_modules/react")) {
              return "react-runtime";
            }
          },
        },
      },
    },
  };
});

function frameworkPlugin(): PluginOption {
  return [
    {
      name: "create-server-action-proxy",
      async load(id, options) {
        if (!/_actions\.(js|ts|jsx|tsx)$/.test(id) || !isInRoutes(id) || options?.ssr) {
          return;
        }

        const result = await createClientServerActionProxyFromPath(id);

        return {
          code: result.code,
        };
      },
    },
    {
      name: "remove-server-exports",
      async load(id, options) {
        if (!/\.(js|ts|jsx|tsx)$/.test(id) || !isInRoutes(id) || options?.ssr) {
          return;
        }

        const contents = await fs.readFile(id, "utf8");
        const loader = getLoader(id);
        const result = await removeServerExportsFromSource(contents, loader);

        return {
          code: result.code,
        };
      },
    },
    {
      name: "ignore-server-files",
      resolveId(source, _, options) {
        if (/\.server\.(ts|js|tsx|jsx)$/.test(source) && options.ssr) {
          return { id: source, external: true };
        }

        return null;
      },
    },
  ];
}
