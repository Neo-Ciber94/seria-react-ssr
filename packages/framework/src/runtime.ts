import { encodeAsync } from "seria/form-data";
import { parseFromStream } from "seria";
import { HEADER_SERVER_ACTION } from "./constants";
import { HttpError } from "./server/http";

// TODO: this should be defined by vite
export const isServer = process.env.IS_SERVER;
export const isBrowser = !isServer;
export const isDev = process.env.NODE_ENV === "development";

type CallServerActionInput = {
	id: string;
	args: any[];
};

/**
 * @internal
 */
export async function callServerAction(input: CallServerActionInput) {
	const args = input.args;
	const body = await encodeAsync(args);
	const res = await fetch("/_action", {
		body,
		method: "POST",
		headers: {
			[HEADER_SERVER_ACTION]: `/${input.id}`,
		},
	});

	if (res.redirected) {
		throw new Error("Redirection not implemented");
	}

	if (!res.ok) {
		throw new HttpError(res.status, "Server action call failed");
	}

	if (!res.body) {
		throw new Error("Response was empty");
	}

	const stream = res.body.pipeThrough(new TextDecoderStream());
	const value = parseFromStream(stream);
	return value;
}
