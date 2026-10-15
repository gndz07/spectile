import type { Issue, OpenAPIDocument } from "../model";
import { type JsonObject, asString, isObject, withoutUndefined } from "./read";
import { fromReferences, resolvePointer } from "./refs";

export type Context = { document: OpenAPIDocument; issues: Issue[] };

export type Located = { pointer: string; value: JsonObject };

const referenceOverrides = (reference: JsonObject) =>
  withoutUndefined({
    summary: asString(reference.summary),
    description: asString(reference.description),
  });

export const resolveObject = (context: Context, pointer: string): Located | undefined => {
  const { pointer: target, value, via, issue } = resolvePointer(context.document, pointer);
  if (issue) context.issues.push(issue);
  if (!isObject(value)) return undefined;
  return { pointer: target, value: { ...value, ...fromReferences(via, referenceOverrides) } };
};
