import fs from "node:fs/promises";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { transform } from "esbuild";
import type { PluginOption, ResolvedConfig } from "vite";
import { resolveFileSystemRoutes } from "../dev";
import { preloadServerEntryRoutes } from "../dev/getServerEntryRoutes";
import { preloadViteServer, startViteServer } from "../dev/vite";
import { invariant } from "../internal";
import { createClientServerActionProxyFromPath } from "./createClientServerActionProxy";
import { removeServerExportsFromSource } from "./removeServerExports";
import { getLoader, normalizePath } from "./utils";
import * as vmod from "./vmod";

type FrameworkPluginConfig = {
	routesDir?: string;
};

export default function frameworkPlugin(
	config?: FrameworkPluginConfig,
): PluginOption {
	const { routesDir = "./src/routes" } = config || {};

	let resolvedConfig: ResolvedConfig | undefined;

	return [
		react(),
		{
			name: "@framework",
			configResolved(config) {
				resolvedConfig = config;
			},
			async config(_viteConfig, { isSsrBuild }) {
				return {
					appType: "custom",
					optimizeDeps: {
						entries: [
							"react",
							"react/jsx-runtime",
							"react/jsx-dev-runtime",
							"react-dom/client",
						],
					},
					build: {
						minify: false,
						rollupOptions: {
							input: isSsrBuild
								? [path.join(process.cwd(), "src", "entry.server.tsx")]
								: [path.join(process.cwd(), "src", "entry.client.tsx")],
							output: isSsrBuild
								? {
										format: "es",
										entryFileNames: "index.js",
									}
								: {
										format: "es",
										manualChunks(id) {
											invariant(
												resolvedConfig,
												"Vite config was not available",
											);

											const relativePath = normalizePath(
												path.relative(process.cwd(), id),
											);

											const isReact =
												relativePath.includes("node_modules/react/") ||
												relativePath.includes("node_modules/react-dom/");

											if (isReact) {
												return "react";
											}

											if (isExternal(id)) {
												return relativePath
													.replace(/^.*\/node_modules\//, "")
													.split("/")[0];
											}

											if (!isSsrBuild) {
												if (isInRoutesDir(routesDir, id)) {
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
						await preloadViteServer();
						await preloadServerEntryRoutes();
						await startViteServer(server);
					}
				};
			},
		},
		{
			name: "@framework-virtual-modules",
			enforce: "pre",
			resolveId(id) {
				if (id.includes("virtual__routes") || id === "virtual:routes") {
					return vmod.resolveVirtualModule("virtual:routes");
				}

				if (id.includes("virtual__app") || id === "virtual:app") {
					return vmod.resolveVirtualModule("virtual:app");
				}
			},
			async load(id) {
				if (id === vmod.resolveVirtualModule("virtual:routes")) {
					const code = await resolveFileSystemRoutes({ routesDir });
					const result = await transform(code, { loader: "ts" });
					return result.code;
				}

				if (id === vmod.resolveVirtualModule("virtual:app")) {
					const appEntryPath = path.join(process.cwd(), "src", "app.tsx");
					const code = await fs.readFile(appEntryPath, "utf-8");
					const result = await transform(code, { loader: "tsx" });
					return result.code;
				}
			},
		},
		{
			name: "@framework-create-server-action-proxy",
			async load(id, options) {
				if (
					isExternal(id) ||
					!/_actions\.(js|ts|jsx|tsx)$/.test(id) ||
					!isInRoutesDir(routesDir, id) ||
					options?.ssr
				) {
					return;
				}

				const result = await createClientServerActionProxyFromPath(id);

				return {
					code: result.code,
				};
			},
		},
		{
			name: "@framework-remove-server-exports",
			//enforce: "pre",
			async load(id, options) {
				if (
					isExternal(id) ||
					!/\.(js|ts|jsx|tsx)$/.test(id) ||
					!isInRoutesDir(routesDir, id) ||
					options?.ssr
				) {
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
			name: "@framework-ignore-server-files",
			resolveId(id, _, options) {
				if (isExternal(id) || options.ssr) {
					return;
				}

				if (/\.server\.(ts|js|tsx|jsx)$/.test(id)) {
					return { id, external: true };
				}

				return null;
			},
		},
		{
			name: "jsx-preamble",
			banner: "import React from 'react'",
		},
	];
}

function isInRoutesDir(routesDir: string, filePath: string) {
	const filePathNormalized = normalizePath(filePath);
	const routesDirAbsolute = normalizePath(path.join(process.cwd(), routesDir));
	return filePathNormalized.startsWith(routesDirAbsolute);
}

function isExternal(id: string) {
	return id.includes("/node_modules/");
}
