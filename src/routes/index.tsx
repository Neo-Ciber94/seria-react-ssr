import { useLoaderData } from "@/framework/react";
import React from "react";

export function loader() {
  return { hello: "throw new Error('adios')" };
}

export default function HomePage() {
  const data = useLoaderData<typeof loader>();
  return <h1>Hello: {data.hello}</h1>;
}
