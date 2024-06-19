import { useLoaderData } from "framework/router";
import { type LoaderFunctionArgs, notFound } from "framework/server";
// import "./todo.css";
import { lazy, useState } from "react";
import { db } from "../../lib/db";
import { type Todo, updateTodo } from "../_actions";

const LazyComponent = lazy(() => import("../../components/big-component"));

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

export default function TodoPage() {
	const data = useLoaderData<typeof loader>();
	const [show, setShow] = useState(false);

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
			<button type="submit">Update</button>

			<button type="submit" onClick={() => setShow((s) => !s)}>
				Show
			</button>
			{show && <LazyComponent />}
		</form>
	);
}
