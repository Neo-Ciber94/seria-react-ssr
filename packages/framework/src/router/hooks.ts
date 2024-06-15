import { useMemo, useCallback } from "react";
import { useNavigation } from ".";
import { HttpError, TypedJson } from "../server/http";
import { LoaderFunction } from "../server/loader";
import { useRouteData, useRoute } from "./contexts";
import { useRouterContext } from "./router";
import { Params } from "./routing";
import { useAppContext } from "../react/context";

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

type LoaderReturnType<T> = T extends LoaderFunction<infer U> ? LoaderDataType<U> : never;

export function useLoaderData<L extends LoaderFunction<unknown>>() {
  const route = useRoute();
  const loaderData = useRouteData().loaderData;
  console.log({ route, loaderData });
  return loaderData[route.id] as LoaderReturnType<L>;
}

export function useMatch() {
  const pathname = usePathname();
  const { router } = useAppContext();
  return useMemo(() => {
    const match = router.match(pathname);
    const params = match?.params || {};
    return { params, match };
  }, [pathname, router]);
}

export function useRouteError() {
  const { error } = useRouteData();
  return useMemo(() => {
    const message = (() => {
      if (error?.message) {
        return error.message;
      }

      if (error?.status === 404) {
        return "Not Found";
      }

      return "Internal Error";
    })();

    return error ? new HttpError(error.status, message) : undefined;
  }, [error]);
}

export function useUrl() {
  const url = useRouteData().url;
  return useMemo(() => new URL(url), [url]);
}

export function useParams<T extends Params = Params>() {
  return useRouterContext().params as T;
}

export function usePathname() {
  return useUrl().pathname;
}

export function useSearchParams() {
  const { searchParams } = useRouterContext();
  const { navigate } = useNavigation();
  const pathname = usePathname();

  const setSearchParams = useCallback(
    (newValue: React.SetStateAction<URLSearchParams>) => {
      const val = typeof newValue === "function" ? newValue(searchParams) : newValue;
      const urlParams = new URLSearchParams(val);
      const url = `${pathname}?${urlParams}`;
      navigate(url, { replace: true });
    },
    [searchParams],
  );

  return [searchParams, setSearchParams] as const;
}
