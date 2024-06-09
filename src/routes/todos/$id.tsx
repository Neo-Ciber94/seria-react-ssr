import { useLoaderData } from "@/framework/router";
import React from "react";

export function loader() {
  return { id: crypto.randomUUID(), text: "Todo 1" };
}

export default function Todo() {
  const data = useLoaderData<typeof loader>();

  return (
    <div>
      <h2>Todo Item</h2>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
