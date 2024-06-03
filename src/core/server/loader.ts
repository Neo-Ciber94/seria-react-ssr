import { invariant } from "../internal";
import { Params } from "../router";

export class LoaderContext {
  #status: number = 200;
  #headers = new Headers();

  setStatusCode(statusCode: number) {
    invariant(
      statusCode >= 100 && statusCode < 600,
      "Invalid status code, expected value between 100-599"
    );

    this.#status = statusCode;
  }

  headers() {
    return this.#headers;
  }

  getResponseInit(): ResponseInit {
    const headers = new Headers(this.#headers);
    return { status: this.#status, headers };
  }
}

export type LoaderFunctionArgs = {
  params: Params;
  request: Request;
  context: LoaderContext;
};

export type LoaderFunction<T> = (
  ctx: LoaderFunctionArgs
) => T | Promise<T> | void | Promise<void>;
