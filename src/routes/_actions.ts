function cache<F extends (...args: any[]) => unknown>(f: F) {
  let value: any = undefined;

  const memo = (...args: any[]) => {
    if (value) {
      return value;
    }

    value = f(...args);
    return value;
  };

  return memo as F;
}

export const add = cache(async (x: number, y: number) => {
  console.log({ x, y, isServer: typeof window === "undefined" });
  return x + y;
});

export async function mul(a: number, b: number) {
  return a * b;
}
