import type { Parameter } from "./types";

/** Unique within an operation: a header and a query parameter may share a name. */
export const parameterKey = ({ in: location, name }: Pick<Parameter, "in" | "name">) =>
  `${location}.${name}`;
