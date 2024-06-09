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

export function setResponse(response: Response, target: http.ServerResponse) {
  for (const [name, value] of response.headers) {
    target.appendHeader(name, value);
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

  target.on("close", cancel);
  target.on("error", cancel);
  reader.read().then(flow, cancel);

  return reader.closed.finally(() => {
    target.off("close", cancel);
    target.off("error", cancel);
  });

  function cancel(error?: any) {
    reader.cancel(error).catch(() => {});
    if (error) {
      target.destroy(error);
    }
  }

  function onDrain() {
    reader.read().then(flow, cancel);
  }

  function flow({ done, value }: ReadableStreamReadResult<Uint8Array>): void | Promise<void> {
    try {
      if (done) {
        target.end();
      } else if (!target.write(value)) {
        target.once("drain", onDrain);
      } else {
        return reader.read().then(flow, cancel);
      }
    } catch (e) {
      cancel(e);
    }
  }
}
