import React from "react";

export default function Scripts() {
    return (
      <>
        <script src="/build/client/assets/seria.js" />
        <script type="module" rel="modulepreload" src="/src/entry.client.tsx" />
      </>
    );
  }
  