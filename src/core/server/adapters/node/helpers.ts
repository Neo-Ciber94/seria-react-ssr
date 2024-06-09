import http from "http";

type CreateRequestArgs = {
  baseUrl: string;
  req: http.IncomingMessage;
};

export async function createRequest({ baseUrl, req }: CreateRequestArgs) {
  const headers = new Headers();

  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((v) => headers.append(name, v));
    } else {
      headers.append(name, value);
    }
  }

  const url = `${baseUrl}${req.url}`;
  const method = req.method;
  const body = method === "GET" || method === "HEAD" ? undefined : getBody(req);

  const abortController = new AbortController();
  req.on("close", () => {
    abortController.abort();
  });

  return new Request(url, {
    signal: abortController.signal,
    method,
    headers,
    body,
  });
}

function getBody(req: http.IncomingMessage) {
  const headers = req.headers;
  const contentLength = Number(headers.contentLength);

  if (!isNaN(contentLength) && contentLength === 0) {
    return null;
  }

  if (req.destroyed) {
    const stream = new ReadableStream();
    stream.cancel();
    return stream;
  }

  let cancelled = false;

  return new ReadableStream({
    start(controller) {
      req.on("data", (chunk) => {
        if (cancelled) {
          return;
        }

        controller.enqueue(chunk);
      });

      req.on("error", (error) => {
        cancelled = true;
        controller.enqueue(error);
      });

      req.on("end", () => {
        if (cancelled) {
          return;
        }

        controller.close();
      });
    },
    pull() {
      req.resume();
    },

    cancel(reason) {
      cancelled = true;
      req.destroy(reason);
    },
  });
}

export async function setResponse(response: Response, target: http.ServerResponse) {
  for (const [name, value] of response.headers) {
    target.setHeader(name, value);
  }

  target.writeHead(response.status);

  if (!response.body) {
    target.end();
    return;
  }

  if (response.body.locked) {
    target.end("Response body was already consumed");
    return;
  }

  const reader = response.body.getReader();

  if (target.destroyed) {
    reader.cancel();
    return;
  }

  function onCancel(error: any) {
    target.off("close", onCancel);
    target.off("error", onCancel);

    reader.cancel(error).catch(() => null);
    target.destroy();
  }

  target.on("close", onCancel);
  target.on("error", onCancel);

  async function next() {
    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          target.end();
          break;
        }

        if (!target.write(value)) {
          target.once("drain", next);
          return;
        }
      }
    } catch (error) {
      onCancel(error);
    }
  }

  next();
}
