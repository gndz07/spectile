import { type SchemaNode, type SchemaRef, type SpecModel, getSchema } from "@spectile/core"
import { COMPOSITIONS } from "./children"
import type { SchemaRow } from "./rows"

const itemsLabel = (items: SchemaRef, model?: SpecModel) => {
  if (items.refName) return items.refName
  if (!model || items.circular) return "unknown"

  const label = schemaTypeLabel(getSchema(model, items), model)

  return label.includes(" | ") ? `(${label})` : label
}

/** Pass the model to label unnamed array items, e.g. `string[]` instead of `unknown[]`. */
export const schemaTypeLabel = (
  { refName, types, items, ...node }: SchemaNode,
  model?: SpecModel,
): string => {
  if (refName) return refName
  if (types.includes("array") && items) {
    const itemLabel = itemsLabel(items, model)
    return types.map((type) => (type === "array" ? `${itemLabel}[]` : type)).join(" | ")
  }
  if (types.length > 0) return types.join(" | ")
  return COMPOSITIONS.find((kind) => node[kind].length > 0) ?? "any"
}

export const schemaRowLabel = ({ name, kind, index, node }: SchemaRow) =>
  name ?? node.title ?? node.refName ?? (index === undefined ? kind : `${kind}[${index}]`)
