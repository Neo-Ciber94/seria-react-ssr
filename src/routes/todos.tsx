import React from "react";
import { Todo } from "../lib/types";
import { useLoaderData, useNavigation } from "@/framework/router";

export async function loader() {
  const response = await fetch("https://jsonplaceholder.typicode.com/todos");
  const data: Todo[] = await response.json();
  return data;
}

export default function TodoListPage() {
  const todos = useLoaderData<typeof loader>();

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <title>Todos</title>
      <h1>Todo List</h1>
      <ul style={{ listStyleType: "none", padding: 0 }}>
        <TodoItem
          todo={{
            id: -1,
            title: "Not Found",
            userId: 1,
            completed: false,
          }}
        />

        {todos.map((todo) => (
          <TodoItem key={todo.id} todo={todo} />
        ))}
      </ul>
    </div>
  );
}

function TodoItem({ todo }: { todo: Todo }) {
  const { navigate } = useNavigation();

  return (
    <li
      key={todo.id}
      style={{
        boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
        borderRadius: "8px",
        border: "1px solid #ccc",
        backgroundColor: "white",
        padding: "20px",
        margin: "10px 0",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <input
          type="checkbox"
          checked={todo.completed}
          readOnly
          style={{ marginRight: "10px" }}
        />
        <a
          href={`/todos/${todo.id}`}
          style={{
            textDecoration: todo.completed ? "line-through" : "none",
            flexGrow: 1,
          }}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/todos/${todo.id}`);
          }}
        >
          {todo.title}
        </a>
      </div>
    </li>
  );
}
