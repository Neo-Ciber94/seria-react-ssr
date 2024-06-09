import http from "http";
import sirv from "sirv";
import { createRequest, setResponse } from "./helpers";
import { handleRequest } from "../../handleRequest";
import path from "path";
import { fileURLToPath } from "url";

const isDev = process.env.NODE_ENV !== "production";

type Next = () => void;
type RequestHandler = (req: http.IncomingMessage, res: http.ServerResponse, next: Next) => void;

function serveDir(dir: string): RequestHandler {
  return sirv(dir, {
    etag: true,
    brotli: true,
    gzip: true,
  });
}

async function ssr(req: http.IncomingMessage, res: http.ServerResponse) {
  try {
    const baseUrl = process.env.ORIGIN ?? getOrigin(req);
    const request = await createRequest({ req, baseUrl });
    const response = await handleRequest(request);
    setResponse(response, res);
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.end();
  }
}

function createMiddleware(...handlers: RequestHandler[]): RequestHandler {
  return (req, res, next) => {
    function handle(index: number) {
      if (index < handlers.length) {
        return handlers[index](req, res, () => handle(index + 1));
      } else {
        return next();
      }
    }

    return handle(0);
  };
}

function getOrigin(req: http.IncomingMessage) {
  const headers = req.headers;

  if (headers.origin) {
    return headers.origin;
  }

  if (headers.referer) {
    return new URL(headers.referer).origin;
  }

  if (headers.host) {
    const protocol = headers.protocol ?? "https://";
    return `${protocol}${headers.host}`;
  }

  throw new Error("Unable to get origin, set the `ORIGIN` environment variable");
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = isDev ? process.cwd() : __dirname;
const clientDir = isDev ? "./build/client" : "./client";

export const handle = createMiddleware(
  serveDir(path.join(rootDir, clientDir)),
  serveDir(path.join(rootDir, "./public")),
  ssr,
);
