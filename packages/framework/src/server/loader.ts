import type { Params } from "../router";

export type LoaderFunctionArgs = {
	params: Params;
	request: Request;
};

export type LoaderFunction<T> = (
	ctx: LoaderFunctionArgs,
) => T | Promise<T> | void | Promise<void>;
