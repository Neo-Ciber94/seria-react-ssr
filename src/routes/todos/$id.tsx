import { useLoaderData } from "@/framework/router";
import React from "react";
import { db } from "../_lib/db";
import { LoaderFunctionArgs } from "@/framework/server/loader";
import { notFound } from "@/framework/server/http";
import { Todo, updateTodo } from "../_actions";

export async function loader({ params }: LoaderFunctionArgs) {
  const todoId = typeof params.id === "string" ? params.id : null;

  if (!todoId) {
    throw notFound();
  }

  const todo: Todo = await db.get(todoId);

  if (!todo) {
    throw notFound();
  }

  return todo;
}

export default function Todo() {
  const data = useLoaderData<typeof loader>();

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      action={async (formData) => {
        const done = formData.get("done") === "on";
        const description = String(formData.get("description"));

        await updateTodo({
          id: data.id,
          done,
          description,
        });
      }}
    >
      <label>
        Completed
        <input name="done" type="checkbox" />
      </label>
      <textarea name="description" defaultValue={data.description} />
      <button>Update</button>
    </form>
  );
}
