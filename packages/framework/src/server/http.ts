import { HEADER_ROUTE_REDIRECT } from "../constants";
import { invariant } from "../internal";

export class TypedJson<T> {
	constructor(
		readonly data: T,
		readonly init?: ResponseInit,
	) {}
}

/**
 * Creates a typed JSON response.
 * @param data The json data to serialize.
 * @param init The response init data.
 */
export function json<T>(data: T, init?: ResponseInit) {
	return new TypedJson(data, init);
}

type RedirectStatusCode = 301 | 303 | 307 | 308;

/**
 * Create a redirection response.
 * @param to The route to redirect to.
 * @param status The redirection status code.
 */
export function redirect(to: string, status: RedirectStatusCode = 303) {
	return new Response(null, {
		status,
		headers: {
			location: to,
			[HEADER_ROUTE_REDIRECT]: to,
		},
	});
}

/**
 * Represents a http error.
 */
export class HttpError extends Error {
	constructor(
		readonly status: number,
		message: string,
	) {
		invariant(
			status >= 400 && status <= 600,
			"Invalid error status code, expected code between 400 and 599",
		);

		super(message);
	}
}

/**
 * Returns a 404 not found error.
 * @param message Error message to display
 */
export function notFound(message = "Not Found") {
	return new HttpError(404, message);
}

/**
 * Returns an error.
 * @param message Error message to display
 */
export function error(status: number, message: string) {
	return new HttpError(status, message);
}
