import { usePageError } from "@/framework/react/error";
import React from "react";

export default function ErrorPage() {
  const { status, message } = usePageError();

  return (
    <div>
      <h1>Error</h1>
      <p>
        <span>{status}</span> <span>{message ?? "Something went wrong"}</span>
      </p>
    </div>
  );
}
