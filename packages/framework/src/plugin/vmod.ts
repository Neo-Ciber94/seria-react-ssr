import path from "node:path";
import fs from "node:fs/promises";

const VIRTUAL_MODULES = ["virtual:app", "virtual:routes"] as const;

type VirtualModule = (typeof VIRTUAL_MODULES)[number];

export function isVirtualModule(id: string): id is VirtualModule {
	return VIRTUAL_MODULES.some((s) => id.includes(s));
}

export function resolveVirtualModule(id: string) {
	return `\0${id}`;
}

export function loadVirtualModule(id: VirtualModule) {
	// biome-ignore lint/suspicious/noControlCharactersInRegex: <explanation>
	const resolvedId = id.replace(/\x00/, "");

	switch (true) {
		case resolvedId.includes("virtual__routes"): {
			return fs.readFile(
				path.join(process.cwd(), "src", "$routes.ts"),
				"utf-8",
			);
		}
		case resolvedId.includes("virtual__app"): {
			return fs.readFile(path.join(process.cwd(), "src", "app.tsx"), "utf-8");
		}
		default:
			throw new Error(`Unable to load virtual module "${resolvedId}".`);
	}
}
