import { ConfigEnv, defineConfig, PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { createClientServerActionProxyFromPath } from "./esbuild/createClientServerActionProxy";
import { removeServerExportsFromSource } from "./esbuild/removeServerExports";
import { getLoader } from "./esbuild/utils";
import path from "path";
import fs from "fs/promises";
import { startViteServer } from "./src/core/server/vite";
// import { startViteServer } from "./src/core/server/vite";

const routesDir = normalizePath(path.join(process.cwd(), "src/routes"));

function isInRoutes(filePath: string) {
  return filePath.startsWith(routesDir);
}

export default defineConfig((config) => {
  return {
    plugins: [
      tsconfigPaths(),
      react(),
      frameworkPlugin(config),
      {
        name: "dev-server",
        async configureServer(server) {
          // const { startViteServer } = await import("./src/core/server/vite");
          // const port = server.config.server.port || 5000;
          // const origin = server.config.server.origin || "http://127.0.0.1:8080";
          await startViteServer(server);
        },
      },
    ],
    optimizeDeps: {
      entries: ["react", "react/jsx-runtime", "react/jsx-dev-runtime", "react-dom/client"],
    },
    resolve: {
      alias: {
        "@/framework": path.join(process.cwd(), "src/core"),
      },
    },
    build: {
      minify: false,
      rollupOptions: {
        input: ["./src/entry.client.tsx"],
        output: {
          format: "es",
          manualChunks(id) {
            const relativePath = normalizePath(path.relative(process.cwd(), id));
            const isReact =
              relativePath.startsWith("node_modules/react") ||
              relativePath.startsWith("node_modules/react-dom");

            if (isReact) {
              return "react";
            }

            if (isExternal(id)) {
              return "vendor";
            }

            if (!config.isSsrBuild) {
              if (isInRoutes(id)) {
                const chunkName = path
                  .relative(routesDir, id)
                  .replaceAll(path.sep, "/")
                  .replaceAll("/", "_")
                  .replaceAll(/\.(j|t)sx?$/g, "");

                return `routes_${chunkName}`;
              }
            }
          },
        },
      },
    },
  };
});

function frameworkPlugin(config: ConfigEnv): PluginOption {
  console.log(config);

  if (config.isSsrBuild) {
    return [];
  }

  return [
    {
      name: "create-server-action-proxy",
      enforce: "pre",
      async load(id) {
        if (isExternal(id) || !/_actions\.(js|ts|jsx|tsx)$/.test(id) || !isInRoutes(id)) {
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
      enforce: "pre",
      async load(id) {
        if (isExternal(id) || !/\.(js|ts|jsx|tsx)$/.test(id) || !isInRoutes(id)) {
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
      resolveId(source, id) {
        console.log(id);
        if (/\.server\.(ts|js|tsx|jsx)$/.test(source)) {
          return { id: source, external: true };
        }

        return null;
      },
    },
  ];
}

function normalizePath(filepath: string) {
  return filepath.replaceAll(path.win32.sep, path.posix.sep);
}

function isExternal(id: string) {
  return id.includes("/node_modules/");
}
