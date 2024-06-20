import fs from "node:fs/promises";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { transform } from "esbuild";
import type { PluginOption, ResolvedConfig } from "vite";
import { resolveServerEntry } from ".";
import { preloadViteServer, startViteServer } from "./vite";
import { invariant } from "../internal";
import { createServerActionReference } from "./createServerActionReference";
import { removeServerExports } from "./removeServerExports";
import { normalizePath } from "./utils";
import * as esbuild from "esbuild";

const virtualAppEntry = "virtual:app-entry";
const appEntryImport = "./app-entry";

const resolveVirtualModule = (virtualModule: string) => `\0${virtualModule}`;

type FrameworkPluginConfig = {
	routesDir?: string;
};

export default function frameworkPlugin(config?: FrameworkPluginConfig): PluginOption {
	const { routesDir = "./src/routes" } = config || {};

	let resolvedConfig: ResolvedConfig | undefined;

	return [
		react(),
		{
			name: "@framework",
			configResolved(config) {
				resolvedConfig = config;
			},
			async config(_viteConfig, { isSsrBuild, command }) {
				return {
					appType: "custom",
					optimizeDeps: {
						entries: ["react", "react/jsx-runtime", "react/jsx-dev-runtime", "react-dom/client"],
					},
					define: {
						"process.env.IS_SERVER": JSON.stringify(isSsrBuild),
						"process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "production"),
					},
					esbuild: {
						jsx: "automatic",
						jsxDev: command !== "build",
					},
					build: {
						minify: false,
						target: "ES2022",
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
										invariant(resolvedConfig, "Vite config was not available");

										const relativePath = normalizePath(path.relative(process.cwd(), id));

										const isReact =
											relativePath.includes("node_modules/react/") ||
											relativePath.includes("node_modules/react-dom/");

										if (isReact) {
											return "react";
										}

										if (isExternal(id)) {
											return relativePath.replace(/^.*\/node_modules\//, "").split("/")[0];
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
						await startViteServer(server);
					}
				};
			},
		},
		{
			name: "@framework-virtual-modules",
			enforce: "pre",
			resolveId(id, importer) {
				if (importer == null) {
					return;
				}

				if (id.includes(appEntryImport) || id === virtualAppEntry) {
					return resolveVirtualModule(virtualAppEntry);
				}
			},
			async load(id) {
				if (id === resolveVirtualModule(virtualAppEntry)) {
					const code = await resolveServerEntry({ routesDir });
					const result = await transform(code, {
						loader: "tsx",
						jsx: "transform",
					});

					return {
						code: result.code,
						map: result.map,
					};
				}
			},
		},
		{
			name: "@framework-create-server-action-reference",
			async load(id, options) {
				if (
					isExternal(id) ||
					!/_actions\.(js|ts|jsx|tsx)$/.test(id) ||
					!isInRoutesDir(routesDir, id) ||
					options?.ssr
				) {
					return;
				}

				const [fileName] = id.split("?");
				const contents = await fs.readFile(fileName, "utf8");
				const result = await createServerActionReference({
					contents,
					fileName,
				});

				return {
					code: result.code,
					map: result.map,
				};
			},
		},
		{
			name: "@framework-remove-server-exports",
			async load(id, options) {
				if (
					isExternal(id) ||
					!/\.(js|ts|jsx|tsx)$/.test(id) ||
					!isInRoutesDir(routesDir, id) ||
					options?.ssr
				) {
					return;
				}

				const [fileName] = id.split("?");
				const source = await fs.readFile(fileName, "utf8");
				const result = await removeServerExports({
					source,
					fileName,
					removeExports: ["loader"]
				});

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
			name: "@framework/transform-jsx-dev",
			async transform(code, id) {
				invariant(resolvedConfig, "unable to resolve vite config");

				if (resolvedConfig.command !== "serve" || isExternal(id)) {
					return;
				}

				const [fileName] = id.split("?");
				const isJsx = /\.(jsx|tsx)$/.test(fileName);

				if (!isJsx) {
					return;
				}

				const loader = fileName.endsWith(".jsx") ? "jsx" : "tsx";
				const result = await esbuild.transform(code, {
					loader,
					sourcefile: fileName,
					sourcemap: true,
					jsx: "transform",
				});

				return {
					code: result.code,
					map: result.map,
				};
			},
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
