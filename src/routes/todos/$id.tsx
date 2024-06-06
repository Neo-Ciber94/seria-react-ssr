import React from "react";
import { Todo } from "../../lib/types";

import { LoaderFunctionArgs } from "../../core/server/loader";
import { notFound } from "@/framework/server/http";
import { useLoaderData, useNavigation } from "@/framework/react";

export async function loader({ params }: LoaderFunctionArgs) {
  const response = await fetch(
    `https://jsonplaceholder.typicode.com/todos/${params.id}`
  );

  if (!response.ok) {
    throw notFound();
  }

  const data: Todo = await response.json();
  return data;
}

export default function TodoPage() {
  const todo = useLoaderData<typeof loader>();
  const navigation = useNavigation();

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <title>Todo Details</title>
      <h1>Todo Details</h1>
      <div
        style={{
          boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
          border: "1px solid #ccc",
          borderRadius: "8px",
          backgroundColor: "white",
          padding: "20px",
          margin: "10px 0",
        }}
      >
        <h2>{todo.title}</h2>
        <p>
          <strong>Completed:</strong> {todo.completed ? "Yes" : "No"}
        </p>
        <p>
          <strong>User ID:</strong> {todo.userId}
        </p>
      </div>
      <a
        href="/todos"
        onClick={(e) => {
          e.preventDefault();
          navigation("/todos");
        }}
      >
        Back
      </a>
    </div>
  );
}
