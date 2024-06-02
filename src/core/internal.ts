class InvariantFailedError extends Error {}

export function invariant(value: unknown, message: string): asserts value {
  if (!value) {
    throw new InvariantFailedError(message);
  }
}
