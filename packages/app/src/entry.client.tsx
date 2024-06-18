import React from "react";
import { hydrateRoot } from "react-dom/client";
import { EntryClient } from "framework/react";

hydrateRoot(
  document,
  <React.StrictMode>
    <EntryClient />
  </React.StrictMode>,
);
