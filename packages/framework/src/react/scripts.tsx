import React from "react";
import type { Manifest } from "vite";

declare var MANIFEST: Manifest | undefined;

const BROWSER_ENTRY = "src/entry.client.tsx";
const SERIA_ENTRY = "assets/seria.js";

export default function Scripts() {
  const seriaFile =
    process.env.NODE_ENV !== "production" ? `build/client/${SERIA_ENTRY}` : SERIA_ENTRY;
  const entryFile = (() => {
    if (process.env.NODE_ENV !== "production" || typeof MANIFEST === "undefined") {
      return BROWSER_ENTRY;
    }

    return MANIFEST[BROWSER_ENTRY].file;
  })();

  return (
    <>
      <script src={`/${seriaFile}`} />
      <script type="module" rel="modulepreload" src={`/${entryFile}`} />
    </>
  );
}
