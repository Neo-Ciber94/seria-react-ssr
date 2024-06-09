import { Link, useLoaderData } from "@/framework/router";
import React from "react";

export function loader() {
  return [
    { id: crypto.randomUUID(), text: "Todo 1", done: false },
    { id: crypto.randomUUID(), text: "Todo 2", done: true },
    { id: crypto.randomUUID(), text: "Todo 3", done: false },
    { id: crypto.randomUUID(), text: "Todo 4", done: false },
    { id: crypto.randomUUID(), text: "Todo 5", done: false },
  ];
}

export default function TodoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const todos = useLoaderData<typeof loader>();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        height: "100vh",
      }}
    >
      <aside
        style={{
          width: 400,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          background: "#B91C1C",
          padding: 5,
        }}
      >
        {todos.map((todo) => {
          return (
            <Link
              to={`/todos/${todo.id}`}
              key={todo.id}
              style={{
                color: "white",
                border: "1px solid white",
                boxShadow: "2px 0px rgba(0,0,0,0.2)",
                padding: 2,
              }}
            >
              <p style={{ fontSize: 20 }}>{todo.text}</p>
              <label>
                Completed
                <input type="checkbox" />
              </label>
            </Link>
          );
        })}
      </aside>

      <main
        style={{
          width: "100%",
          padding: 10,
        }}
      >
        {children}
      </main>
    </div>
  );
}
