import { ConfigEnv, PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs/promises";
import { startViteServer } from "../server/vite";
import { createClientServerActionProxyFromPath } from "./createClientServerActionProxy";
import { removeServerExportsFromSource } from "./removeServerExports";
import { getLoader } from "./utils";
import { normalizePath } from "../internal";

const routesDir = normalizePath(path.join(process.cwd(), "src", "routes"));
console.log({ routesDir });

function isInRoutes(filePath: string) {
  return filePath.startsWith(routesDir);
}

export default function frameworkPlugin(config: ConfigEnv): PluginOption {
  console.log(config);

  if (config.isSsrBuild) {
    return [
      {
        name: "server",
        async config() {
          return {
            build: {
              rollupOptions: {
                treeshake: true,
                output: {
                  entryFileNames: "index.js",
                  chunkFileNames: "assets/index-chunk.js",
                  assetFileNames: "assets/[name].[ext]",
                },
              },
            },
          };
        },
      },
    ];
  }

  return [
    react(),
    {
      name: "@framework",
      async config() {
        return {
          appType: "custom",
          optimizeDeps: {
            entries: ["react", "react/jsx-runtime", "react/jsx-dev-runtime", "react-dom/client"],
          },
          build: {
            minify: false,
            rollupOptions: {
              input: [path.join(process.cwd(), "src", "entry.client.tsx")],
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
      resolveId(id, importer) {
        console.log({ id, importer });
        if (isVirtualModule(id)) {
          console.log({ id });
          return "\0" + id;
        }
      },
      load(id) {
        if (isVirtualModule(id)) {
          const virtualMod = loadVirtualModule(id);
          console.log({ virtualMod });
          return virtualMod;
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
      resolveId(source) {
        if (/\.server\.(ts|js|tsx|jsx)$/.test(source)) {
          return { id: source, external: true };
        }

        return null;
      },
    },
  ];
}

function isExternal(id: string) {
  return id.includes("/node_modules/");
}

const VIRTUAL_MODULES = ["virtual__routes", "virtual__app"] as const;

type VirtualModule = (typeof VIRTUAL_MODULES)[number];

function isVirtualModule(id: string): id is VirtualModule {
  return VIRTUAL_MODULES.includes(id as VirtualModule);
}

function loadVirtualModule(id: VirtualModule) {
  switch (id) {
    case "virtual__routes": {
      return fs.readFile(path.join(process.cwd(), "src", "$routes.ts"), "utf-8");
    }
    case "virtual__app": {
      return fs.readFile(path.join(process.cwd(), "src", "app.tsx"), "utf-8");
    }
    default:
      throw new Error(`Unable to load virtual module "${id}".`);
  }
}
