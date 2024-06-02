import { invariant } from "../internal";
import { Params } from "../router";

export class LoaderContext {
  #init: ResponseInit = {};

  setStatusCode(statusCode: number) {
    invariant(
      statusCode >= 100 && statusCode < 600,
      "Invalid status code, expected value between 100-599"
    );

    this.#init.status = statusCode;
  }

  getResponseInit(): ResponseInit {
    return this.#init;
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
