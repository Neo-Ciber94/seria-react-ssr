import React from "react";

export function loader() {
  return [];
}

export default function TodoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1>Todo List</h1>
      {children}
    </div>
  );
}
