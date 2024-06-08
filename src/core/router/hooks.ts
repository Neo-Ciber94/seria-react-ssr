import { TypedJson } from "../server/http";
import { LoaderFunction } from "../server/loader";
import { useRouteData } from "./routing";

type LoaderDataType<T> =
  T extends Promise<infer U>
    ? LoaderDataType<U>
    : T extends Response
      ? never
      : T extends TypedJson<infer O>
        ? LoaderDataType<O>
        : T extends (...args: any[]) => unknown
          ? never
          : T;

type LoaderReturnType<T> =
  T extends LoaderFunction<infer U> ? LoaderDataType<U> : never;

export function useLoaderData<L extends LoaderFunction<unknown>>() {
  return useRouteData().loaderData as LoaderReturnType<L>;
}
