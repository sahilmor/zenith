export const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export const invariant = (condition: boolean, message: string): asserts condition => {
  if (!condition) {
    throw new Error(message);
  }
};
