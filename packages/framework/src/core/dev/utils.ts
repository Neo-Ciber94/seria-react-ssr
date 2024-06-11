import path from "path";

const loader = {
  ".js": "js",
  ".ts": "ts",
  ".jsx": "jsx",
  ".tsx": "tsx",
} as const;

type Ext = keyof typeof loader;
export type JavascriptLoader = (typeof loader)[Ext];

export function getLoader(filePath: string): JavascriptLoader {
  const ext = path.extname(filePath) as Ext;
  return loader[ext];
}
