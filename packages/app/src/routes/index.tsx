import { useLoaderData } from "framework/router";
import React from "react";

export function loader() {
  return { word: "World" };
}

export default function HomePage() {
  const data = useLoaderData<typeof loader>();
  return <h1>Hello {data.word}</h1>;
}
