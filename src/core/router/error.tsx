import React from "react";
import { usePageError } from "../react/server";

export function NotFoundPage() {
  const error = usePageError();
  return (
    <div>
      <h1>Not Found</h1>
    </div>
  );
}

export function ErrorPage() {
  const error = usePageError();

  return (
    <div>
      <h1>Error</h1>
      <pre>{JSON.stringify(error)}</pre>
    </div>
  );
}
