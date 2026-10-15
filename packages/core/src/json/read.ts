export type JsonObject = Record<string, unknown>;

export const isObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isOneOf =
  <T extends string>(values: readonly T[]) =>
  (value: unknown): value is T =>
    typeof value === "string" && (values as readonly string[]).includes(value);

export const asString = (value: unknown) => (typeof value === "string" ? value : undefined);

export const asBoolean = (value: unknown) => value === true;

export const asOptionalBoolean = (value: unknown) => (typeof value === "boolean" ? value : undefined);

export const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

export const asStrings = (value: unknown) =>
  asArray(value).filter((item): item is string => typeof item === "string");

export const withoutUndefined = <T extends object>(value: T): Partial<T> =>
  Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as Partial<T>;

export const entries = (value: unknown): [string, unknown][] =>
  isObject(value) ? Object.entries(value) : [];
