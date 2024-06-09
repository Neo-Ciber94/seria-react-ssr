class InvariantFailedError extends Error {}

export function invariant(value: unknown, message: string): asserts value {
  if (!value) {
    throw new InvariantFailedError(message);
  }
}

function deferred<T>() {
  let resolve = (value: T) => {};
  let reject = (error: any) => {};

  const promise = new Promise<T>((resolveFunc, rejectFunc) => {
    resolve = resolveFunc;
    reject = rejectFunc;
  });

  return { promise, resolve, reject };
}

type PromiseState<T> = { state: "resolved"; data: T } | { state: "rejected"; error: any };

export async function untilAll(promises: Record<string, Promise<any>>) {
  const entries = Object.entries(promises);
  const completedPromises: Record<string, PromiseState<any>> = {};
  const { promise, resolve } = deferred<Record<string, PromiseState<any>>>();

  let count = 0;

  for (const [id, p] of entries) {
    p.then((data) => {
      completedPromises[id] = { state: "resolved", data };
    })
      .catch((error) => {
        completedPromises[id] = { state: "rejected", error };
      })
      .finally(() => {
        count += 1;

        if (count >= entries.length) {
          resolve(completedPromises);
        }
      });
  }

  return promise;
}
