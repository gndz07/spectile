import { type SchemaNode, type SchemaRef, type SpecModel, getMergedSchema } from "@spectile/core"

const COMPOSITIONS = { allOf: "all of", oneOf: "one of", anyOf: "any of" } as const

const arrayLabel = (model: SpecModel, items: SchemaRef | undefined) => {
  if (!items) return "array"
  if (items.refName) return `array of ${items.refName}`
  if (items.circular) return "array"
  const label = typeLabel(model, getMergedSchema(model, items))
  return / or | · /.test(label) ? `array of (${label})` : `array of ${label}`
}

const valueType = (value: unknown) => {
  if (value === null) return "null"
  if (Array.isArray(value)) return "array"
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number"
  return typeof value
}

/** The declared types, else the types of a const or enum's values (`const: "cat"` is a string). */
const typesOf = (node: SchemaNode) => {
  if (node.types.length > 0) return node.types
  const values = node.const !== undefined ? [node.const] : (node.enum ?? [])
  return [...new Set(values.map(valueType))]
}

const baseLabel = (model: SpecModel, node: SchemaNode) => {
  const types = typesOf(node)
  if (types.length > 0)
    return types.map((type) => (type === "array" ? arrayLabel(model, node.items) : type)).join(" or ")
  const kind = (Object.keys(COMPOSITIONS) as (keyof typeof COMPOSITIONS)[]).find(
    (candidate) => node[candidate].length > 0,
  )
  return kind ? COMPOSITIONS[kind] : "any"
}

/** In plain words: "User", "string or null", "array of User", "string · email". */
export const typeLabel = (model: SpecModel, node: SchemaNode): string => {
  if (node.refName) return node.refName
  const label = baseLabel(model, node)
  return node.format ? `${label} · ${node.format}` : label
}
