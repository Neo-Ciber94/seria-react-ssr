export const getLoader = (path: string) =>
  path.endsWith(".ts")
    ? "ts"
    : path.endsWith(".tsx")
      ? "tsx"
      : path.endsWith(".jsx")
        ? "jsx"
        : "js";
