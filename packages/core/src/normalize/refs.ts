import type { Issue, IssueCode } from "../model";
import { getAtPointer } from "./pointer";
import { isObject } from "./read";

export type Resolution = { pointer: string; value: unknown; issue?: Issue };

export const issue = (code: IssueCode, message: string, pointer: string): Issue => ({
  code,
  message,
  pointer,
});

export const refOf = (value: unknown) =>
  isObject(value) && typeof value.$ref === "string" ? value.$ref : undefined;

export const resolvePointer = (document: unknown, pointer: string): Resolution => {
  const visited = new Set<string>();
  let current = pointer;
  while (!visited.has(current)) {
    visited.add(current);
    if (!current.startsWith("#")) {
      return {
        pointer: current,
        value: undefined,
        issue: issue("external-ref", `External reference ${current} was not bundled`, pointer),
      };
    }
    const value = getAtPointer(document, current);
    if (value === undefined) {
      return {
        pointer: current,
        value,
        issue: issue("unresolved-ref", `Cannot resolve ${current}`, pointer),
      };
    }
    const ref = refOf(value);
    if (ref === undefined) return { pointer: current, value };
    current = ref;
  }
  return {
    pointer: current,
    value: undefined,
    issue: issue("ref-cycle", `References loop back to ${current}`, pointer),
  };
};
