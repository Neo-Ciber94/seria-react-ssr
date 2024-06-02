import { Params } from "../router";

export type LoaderContextArgs = {
  params: Params;
  request: Request;
};

export type LoaderFunction<T> = (ctx: LoaderContextArgs) => T | Promise<T>;
