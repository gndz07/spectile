import { type SchemaNode, type SchemaRef, type SpecModel, getMergedSchema } from "@spectile/core"
import { COMPOSITIONS } from "./children"
import type { SchemaRow } from "./rows"

const itemsLabel = (items: SchemaRef, model?: SpecModel) => {
  if (items.refName) return items.refName
  if (!model || items.circular) return "unknown"

  const label = schemaTypeLabel(getMergedSchema(model, items), model)

  return label.includes(" | ") || label.includes(" · ") ? `(${label})` : label
}

const baseTypeLabel = ({ types, items, ...node }: SchemaNode, model?: SpecModel) => {
  if (types.includes("array") && items) {
    const itemLabel = itemsLabel(items, model)
    return types.map((type) => (type === "array" ? `${itemLabel}[]` : type)).join(" | ")
  }
  if (types.length > 0) return types.join(" | ")
  return COMPOSITIONS.find((kind) => node[kind].length > 0) ?? "any"
}

/** Pass the model to label unnamed array items, e.g. `string[]` instead of `unknown[]`. */
export const schemaTypeLabel = (node: SchemaNode, model?: SpecModel): string => {
  if (node.refName) return node.refName
  const label = baseTypeLabel(node, model)
  return node.format ? `${label} · ${node.format}` : label
}

export const schemaRowLabel = ({ name, kind, index, node }: SchemaRow) =>
  name ?? node.title ?? node.refName ?? (index === undefined ? kind : `${kind}[${index}]`)

const show = (value: unknown) => JSON.stringify(value) ?? String(value)

/** Shown after the type, e.g. `= true`. */
export const schemaDefaultLabel = ({ default: value }: SchemaNode) =>
  value === undefined ? undefined : `= ${show(value)}`

const bound = (symbol: string, value: number | undefined) =>
  value === undefined ? [] : [`${symbol} ${value}`]

const range = (noun: string, min: number | undefined, max: number | undefined) => {
  if (min !== undefined && max !== undefined) return [`${min}–${max} ${noun}`]
  if (min !== undefined) return [`at least ${min} ${noun}`]
  return max === undefined ? [] : [`at most ${max} ${noun}`]
}

export type AllowedValues = { kind: "const" | "enum"; values: unknown[] }

/** The one value a `const` allows, or an `enum`'s list; undefined when any value goes. */
export const schemaAllowedValues = (node: SchemaNode): AllowedValues | undefined => {
  if (node.const !== undefined) return { kind: "const", values: [node.const] }
  return node.enum ? { kind: "enum", values: node.enum } : undefined
}

/** Limits, e.g. `≥ 1 · ≤ 100`; undefined when there are none. Allowed values are `schemaAllowedValues`. */
export const schemaConstraintsLabel = (node: SchemaNode) => {
  const { constraints: limits } = node
  const parts = [
    ...(limits.exclusiveMinimum === undefined
      ? bound("≥", limits.minimum)
      : bound(">", limits.exclusiveMinimum)),
    ...(limits.exclusiveMaximum === undefined
      ? bound("≤", limits.maximum)
      : bound("<", limits.exclusiveMaximum)),
    ...(limits.multipleOf === undefined ? [] : [`multiple of ${limits.multipleOf}`]),
    ...range("characters", limits.minLength, limits.maxLength),
    ...range("items", limits.minItems, limits.maxItems),
    ...range("properties", limits.minProperties, limits.maxProperties),
    ...(limits.uniqueItems ? ["unique items"] : []),
    ...(limits.pattern === undefined ? [] : [`matches ${limits.pattern}`]),
  ]
  return parts.length > 0 ? parts.join(" · ") : undefined
}
