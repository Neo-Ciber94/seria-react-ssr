import fs from "fs/promises";
import path from "path";
import * as seria from "seria";

class FileSystemJsonStorage {
	#filePath: string;

	constructor(filePath: string) {
		this.#filePath = path.isAbsolute(filePath)
			? filePath
			: path.join(process.cwd(), filePath);
	}

	async set(key: string, value: unknown) {
		await ensureDatabaseFileIsCreated(this.#filePath);

		const json = await this.#readJson();
		json[key] = value;
		await fs.writeFile(this.#filePath, seria.stringify(json));
	}

	async get(key: string) {
		await ensureDatabaseFileIsCreated(this.#filePath);

		const json = await this.#readJson();
		return json[key];
	}

	async getAll() {
		await ensureDatabaseFileIsCreated(this.#filePath);

		const json = await this.#readJson();
		return Object.values(json) as any[];
	}

	async delete(key: string) {
		await ensureDatabaseFileIsCreated(this.#filePath);

		const json = await this.#readJson();
		if (!json[key]) {
			return false;
		}

		delete json[key];
		await fs.writeFile(this.#filePath, seria.stringify(json));
		return true;
	}

	async #readJson() {
		const raw = await fs.readFile(this.#filePath, "utf-8");
		const json = seria.parse(raw) as Record<string, any>;
		return json;
	}
}

export const db = new FileSystemJsonStorage("./local/data.json");

async function ensureDatabaseFileIsCreated(filePath: string) {
	const fileExists = await exists(filePath);

	if (fileExists) {
		return;
	}

	const dir = path.dirname(filePath);
	await fs.mkdir(dir, { recursive: true });
	await fs.writeFile(filePath, seria.stringify({}));
}

async function exists(filePath: string) {
	try {
		await fs.stat(filePath);
		return true;
	} catch {
		return false;
	}
}
