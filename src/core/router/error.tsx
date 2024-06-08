import React from "react";
import { usePageError } from "../react/error";

const STYLES: React.CSSProperties = {
  width: "100%",
  height: "90vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

type ErrorComponentProps = {
  status: number;
  message: string;
};

function ErrorComponent({ status, message }: ErrorComponentProps) {
  return (
    <div style={STYLES}>
      <h1>{`${status} | ${message}`}</h1>
    </div>
  );
}

export function NotFound() {
  return <ErrorComponent status={404} message="Not Found" />;
}

export function ErrorPage() {
  const { status, message = "Something went wrong" } = usePageError();
  return <ErrorComponent status={status} message={message} />;
}
