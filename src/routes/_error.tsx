import { usePageError } from "@/framework/react/error";
import React from "react";

export default function ErrorPage() {
  const { statusCode, message } = usePageError();

  return (
    <div>
      <h1>Error</h1>
      <p>
        <span>{statusCode}</span>{" "}
        <span>{message ?? "Something went wrong"}</span>
      </p>
    </div>
  );
}
