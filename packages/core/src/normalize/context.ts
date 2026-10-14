import type { Issue, OpenAPIDocument } from "../model";
import { type JsonObject, isObject } from "./read";
import { resolvePointer } from "./refs";

export type Context = { document: OpenAPIDocument; issues: Issue[] };

export type Located = { pointer: string; value: JsonObject };

export const resolveObject = (context: Context, pointer: string): Located | undefined => {
  const { pointer: target, value, issue } = resolvePointer(context.document, pointer);
  if (issue) context.issues.push(issue);
  return isObject(value) ? { pointer: target, value } : undefined;
};
