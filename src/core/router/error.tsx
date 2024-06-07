import React from "react";
import { usePageError } from "../react/error";

const STYLES: React.CSSProperties = {
  width: "100%",
  height: "90vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

export function NotFound() {
  <div style={STYLES}>
    <h1>404 | Not Found</h1>
  </div>;
}

export function ErrorPage() {
  const { status, message = "Something went wrong" } = usePageError();

  return (
    <div style={STYLES}>
      <h1>
        {status} | {message}
      </h1>
    </div>
  );
}
