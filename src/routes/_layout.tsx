import { useLoaderData } from "@/framework/router";
import React from "react";

export function loader() {
  return [
    { id: crypto.randomUUID(), text: "Todo 1" },
    { id: crypto.randomUUID(), text: "Todo 2" },
    { id: crypto.randomUUID(), text: "Todo 3" },
    { id: crypto.randomUUID(), text: "Todo 4" },
    { id: crypto.randomUUID(), text: "Todo 5" },
  ];
}

export default function TodoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = useLoaderData<typeof loader>();

  return (
    <div>
      <h2>Todo List</h2>
      {children}

      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
