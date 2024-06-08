import { useLoaderData, useNavigation } from "@/framework/react";
import React, { useEffect, useState } from "react";
import { add } from "./_actions";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const __other = () => ({
  text: "hello world",
  number: Promise.resolve(23),
  obj: delay(2000).then(() => ({ active: true })),
});
export const loader = __other;

export default function HomePage() {
  const { number, obj, text } = useLoaderData<typeof loader>();
  const pendingNumber = usePromise(number);
  const pendingObj = usePromise(obj);
  const navigation = useNavigation();

  useEffect(() => {
    number.then((x) => console.log(x));
  }, [number]);

  return (
    <div>
      <title>Home</title>
      <a
        href="/todos"
        onClick={(ev) => {
          ev.preventDefault();
          navigation("/todos");
        }}
      >
        Go to todos
      </a>
      <h1>{text}</h1>
      <p>{pendingNumber.isPending ? "Loading..." : pendingNumber.value}</p>
      <p>
        {pendingObj.isPending ? "Loading..." : JSON.stringify(pendingObj.value)}
      </p>
      <button
        onClick={() => {
          navigation("/redirect");
        }}
      >
        Redirect
      </button>
      <button
        onClick={async () => {
          const result = await add(10, 2);
          console.log(result);
        }}
      >
        Call Action
      </button>
    </div>
  );
}

function usePromise<T>(promise: Promise<T>) {
  const [isPending, setIsPending] = useState(true);
  const [value, setValue] = useState<T>();

  useEffect(() => {
    promise.then((x) => setValue(x)).finally(() => setIsPending(false));
  }, [promise]);

  return { value, isPending };
}
