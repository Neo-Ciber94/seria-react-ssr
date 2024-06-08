import React from 'react';
import { redirect } from "@/framework/server/http";

export function loader() {
  return redirect("/todos");
}

export default function RedirectPage() {
  return <h1>You should not be reading this, but redirected</h1>;
}
