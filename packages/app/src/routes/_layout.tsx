// import "./styles.css";
import { Link, useLoaderData, useNavigation } from "framework/router";
import React, { useEffect } from "react";

import { createTodo, Todo } from "./_actions";
import { Await } from "framework/router";
import { db } from "@/lib/db";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function loader() {
  const todos: Todo[] = await db.getAll();
  return {
    todos,
    pending: delay(1000).then(() => "Pending Resolved!"),
  };
}

export default function TodoLayout({ children }: { children: React.ReactNode }) {
  const { todos, pending } = useLoaderData<typeof loader>();
  const navigation = useNavigation();

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
        <div style={{ width: "100%" }} key="1">
          <form
            style={{
              display: "flex",
              flexDirection: "column",
              color: "white",
            }}
            action={async (formData) => {
              const description = String(formData.get("description"));

              if (!description) {
                return;
              }

              await createTodo({ description });
              navigation.refresh();
            }}
          >
            <h2>New todo</h2>
            <textarea name="description" />
            <button type="submit">Create</button>
          </form>

          <h2 style={{ color: "white" }}>Todos</h2>
          {todos.length === 0 && <h2 style={{ color: "rgba(255,255,255,0.5)" }}>No todos</h2>}
        </div>

        <div style={{ width: "100%" }}>
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
                <p style={{ fontSize: 20 }}>{todo.description}</p>
              </Link>
            );
          })}
        </div>
      </aside>
      <Await promise={pending} fallback={"Loading..."} resolved={(value) => value} />

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
