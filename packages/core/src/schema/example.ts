import { isObject } from "../json/read"
import type { SchemaNode, SchemaRef, SpecModel } from "../model"
import { getSchema } from "./get"

export type ExampleOptions = {
  /** `request` leaves out readOnly properties, `response` leaves out writeOnly ones. */
  usage?: "request" | "response"
}

const STRING_FORMATS: Record<string, string> = {
  date: "2024-01-01",
  "date-time": "2024-01-01T00:00:00Z",
  time: "00:00:00Z",
  email: "user@example.com",
  uuid: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  uri: "https://example.com",
  url: "https://example.com",
  hostname: "example.com",
  ipv4: "192.0.2.1",
  ipv6: "2001:db8::1",
}

const declaredValue = (node: SchemaNode) =>
  node.examples.length > 0
    ? node.examples[0]
    : node.const !== undefined
      ? node.const
      : node.default !== undefined
        ? node.default
        : node.enum?.[0]

/** A plausible value for a schema: its own example or default when it has one, otherwise one built from its type. */
export const exampleFromSchema = (
  model: SpecModel,
  ref: SchemaRef,
  { usage = "request" }: ExampleOptions = {},
): unknown => {
  const hidden = (node: SchemaNode) => (usage === "request" ? node.readOnly : node.writeOnly)

  const build = (ref: SchemaRef, ancestors: ReadonlySet<string>): unknown => {
    if (ancestors.has(ref.pointer)) return undefined
    const node = getSchema(model, ref)
    const declared = declaredValue(node)
    if (declared !== undefined) return declared

    const inner = new Set([...ancestors, ref.pointer])
    const child = (schema: SchemaRef) => build(schema, inner)
    const type = node.types.find((candidate) => candidate !== "null")

    if (node.allOf.length > 0) {
      const parts = [
        ...node.allOf.map(child),
        type === "object" ? objectOf(node, inner) : undefined,
      ]
      const objects = parts.filter(isObject)
      return objects.length > 0
        ? Object.assign({}, ...objects)
        : parts.find((part) => part !== undefined)
    }
    const choice = node.oneOf[0] ?? node.anyOf[0]
    if (choice && node.properties.length === 0) return child(choice)

    switch (type ?? (node.properties.length > 0 ? "object" : undefined)) {
      case "object":
        return objectOf(node, inner)
      case "array": {
        const item = node.items && child(node.items)
        return item === undefined ? [] : [item]
      }
      case "string":
        return (node.format && STRING_FORMATS[node.format]) ?? "string"
      case "integer":
      case "number":
        return node.constraints.minimum ?? 0
      case "boolean":
        return true
      default:
        return node.types.includes("null") ? null : undefined
    }
  }

  const objectOf = (node: SchemaNode, ancestors: ReadonlySet<string>) =>
    Object.fromEntries(
      node.properties.flatMap(({ name, schema }) => {
        if (hidden(getSchema(model, schema))) return []
        const value = build(schema, ancestors)
        return value === undefined ? [] : [[name, value]]
      }),
    )

  return build(ref, new Set())
}
