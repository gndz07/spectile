import type { SchemaNode } from "@spectile/core";
import { COMPOSITIONS } from "./children";
import type { SchemaRow } from "./rows";

export const schemaTypeLabel = ({ refName, types, items, ...node }: SchemaNode): string => {
  if (refName) return refName;
  if (types.includes("array") && items) {
    const itemLabel = items.refName ?? "unknown";
    return types.map((type) => (type === "array" ? `${itemLabel}[]` : type)).join(" | ");
  }
  if (types.length > 0) return types.join(" | ");
  return COMPOSITIONS.find((kind) => node[kind].length > 0) ?? "any";
};

export const schemaRowLabel = ({ name, kind, index, node }: SchemaRow) =>
  name ?? node.title ?? node.refName ?? (index === undefined ? kind : `${kind}[${index}]`);
