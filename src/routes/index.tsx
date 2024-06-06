import { useLoaderData } from "@/framework/react";
import React, { useEffect, useState } from "react";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function loader() {
  return {
    text: "hello world",
    number: Promise.resolve(23),
    obj: delay(2000).then(() => ({ active: true })),
  };
}

export default function HomePage() {
  const { number, obj, text } = useLoaderData<typeof loader>();
  const pendingNumber = usePromise(number);
  const pendingObj = usePromise(obj);

  useEffect(() => {
    number.then((x) => console.log(x));
  }, [number]);

  return (
    <div>
      <a href="/todos">Go to todos</a>
      <h1>{text}</h1>
      <p>{pendingNumber.isPending ? "Loading..." : pendingNumber.value}</p>
      <p>
        {pendingObj.isPending ? "Loading..." : JSON.stringify(pendingObj.value)}
      </p>
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
