import type { PluginOption, ResolvedConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs/promises";
import { startViteServer } from "../server/vite";
import { createClientServerActionProxyFromPath } from "./createClientServerActionProxy";
import { removeServerExportsFromSource } from "./removeServerExports";
import { getLoader } from "./utils";
import { invariant, normalizePath } from "../internal";
import * as vmod from "./vmod";
import { transform } from "esbuild";

const routesDir = normalizePath(path.join(process.cwd(), "src", "routes"));
console.log({ routesDir });

function isInRoutes(filePath: string) {
  return filePath.startsWith(routesDir);
}

export default function frameworkPlugin(): PluginOption {
  let resolvedConfig: ResolvedConfig | undefined;

  return [
    react(),
    {
      name: "@framework",
      configResolved(config) {
        resolvedConfig = config;
      },
      async config(viteConfig) {
        return {
          appType: "custom",
          optimizeDeps: {
            entries: ["react", "react/jsx-runtime", "react/jsx-dev-runtime", "react-dom/client"],
          },
          build: {
            minify: false,
            treeshake: true,
            rollupOptions: {
              input: [path.join(process.cwd(), "src", "entry.client.tsx")],
              output: viteConfig.ssr
                ? {
                    format: "es",
                    entryFileNames: "index.js",
                    chunkFileNames: "assets/index-chunk.js",
                    assetFileNames: "assets/[name].[ext]",
                  }
                : {
                    format: "es",
                    manualChunks(id) {
                      invariant(resolvedConfig, "Vite config was not available");

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

                      if (!resolvedConfig.ssr) {
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
      },
      async configureServer(server) {
        return async () => {
          if (!server.config.server.middlewareMode) {
            await startViteServer(server);
          }
        };
      },
    },
    {
      name: "@framework-virtual-modules",
      enforce: "pre",
      resolveId(id) {
        if (vmod.isVirtualModule(id)) {
          return vmod.resolveVirtualModule(id);
        }
      },
      async load(id) {
        if (vmod.isVirtualModule(id)) {
          const code = await vmod.loadVirtualModule(id);
          console.log({ code });
          const result = await transform(code, { loader: "tsx" });
          return result.code;
        }
      },
    },
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
      resolveId(id) {
        if (isExternal(id)) {
          return;
        }

        if (/\.server\.(ts|js|tsx|jsx)$/.test(id)) {
          return { id, external: true };
        }

        return null;
      },
    },
  ];
}

function isExternal(id: string) {
  return id.includes("/node_modules/");
}
