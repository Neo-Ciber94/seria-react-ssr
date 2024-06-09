import { defineConfig, PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { createClientServerActionProxyFromPath } from "./esbuild/createClientServerActionProxy";
import { removeServerExportsFromSource } from "./esbuild/removeServerExports";
import { getLoader } from "./esbuild/utils";
import path from "path";

export default defineConfig((config) => {
  console.log(config);

  return {
    plugins: [frameworkPlugin(), tsconfigPaths(), react()],
    esbuild: {
      format: "esm",
    },
    build: {
      manifest: true,
      minify: false,
      rollupOptions: {
        input: "./src/entry.client.tsx",
        plugins: [frameworkPlugin()],
      },
    },
  };
});

function frameworkPlugin(): PluginOption {
  const routesDir = path.join(process.cwd(), "src/routes").replaceAll(path.sep, "/");

  function isInRoutes(filePath: string) {
    return filePath.startsWith(routesDir);
  }

  return [
    {
      name: "create-server-action-proxy",
      async transform(_code, id) {
        if (!/_actions\.(js|ts|jsx|tsx)$/.test(id) || !isInRoutes(id)) {
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
      async transform(code, id) {
        if (!/\.(js|ts|jsx|tsx)$/.test(id) || !isInRoutes(id)) {
          return;
        }

        const loader = getLoader(id);
        const result = await removeServerExportsFromSource(code, loader);

        return {
          code: result.code,
        };
      },
    },
    {
      name: "ignore-server-files",
      resolveId(source) {
        if (/\.(server\.(ts|js|tsx|jsx))$/.test(source)) {
          return { id: source, external: true };
        }
        return null;
      },
    },
  ];
}
