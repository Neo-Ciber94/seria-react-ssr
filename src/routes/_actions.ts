import { db } from "./_lib/db";

export type Todo = {
  id: string;
  done: boolean;
  description: string;
};

export async function createTodo(newTodo: Pick<Todo, "description">) {
  const id = crypto.randomUUID();
  const todo: Todo = {
    id,
    done: false,
    description: newTodo.description,
  };

  await db.set(id, todo);
}

export async function deleteTodo(todoId: string) {
  const wasDeleted = await db.delete(todoId);
  return wasDeleted;
}

export async function toggleTodo(todoId: string, done: boolean) {
  const todo: Todo | null = await db.get(todoId);

  if (!todo) {
    return false;
  }

  todo.done = done;
  await db.set(todo.id, todo);
}
