import React from "react";
import { useLoaderData } from "framework/router";
import { LoaderFunctionArgs } from "framework/server";

export function loader(args: LoaderFunctionArgs) {
  return args.params.dynamic as string;
}

export default function DynamicPage() {
  const data = useLoaderData<typeof loader>();

  return <h1>Params: {data}</h1>;
}
