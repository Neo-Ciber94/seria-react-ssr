import fs from "node:fs";
import type http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sirv from "sirv";
import { createRequest, getOrigin, setResponse } from "./helpers";
import type { ServerEntryContext } from "../../server-entry";
import { createRequestHandler } from "../../handleRequest";

type Next = () => void;
type RequestHandler = (
	req: http.IncomingMessage,
	res: http.ServerResponse,
	next: Next,
) => void;

function serveDir(dir: string) {
	return (
		fs.existsSync(dir) &&
		sirv(dir, {
			etag: true,
			brotli: true,
			gzip: true,
		})
	);
}

function ssr(handler: (req: Request) => Promise<Response>) {
	return async (req: http.IncomingMessage, res: http.ServerResponse) => {
		try {
			const baseUrl = process.env.ORIGIN ?? getOrigin(req);
			const request = await createRequest({ req, baseUrl });
			const response = await handler(request);
			setResponse(response, res);
		} catch (err) {
			console.error(err);
			res.statusCode = 500;
			res.end();
		}
	};
}

type Handler = RequestHandler | null | undefined | false;

function createMiddleware(...args: Handler[]): RequestHandler {
	const handlers = args.filter(Boolean) as RequestHandler[];

	return (req, res, next) => {
		function handle(index: number): any {
			if (index < handlers.length) {
				return handlers[index](req, res, () => handle(index + 1));
			} else {
				return next();
			}
		}

		return handle(0);
	};
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..", "client");

export function createHandler(context: ServerEntryContext) {
	const requestHandler = createRequestHandler(context);

	return createMiddleware(
		serveDir(path.join(rootDir, "assets")),
		serveDir(path.join(rootDir, ".")),
		ssr(requestHandler),
	);
}
