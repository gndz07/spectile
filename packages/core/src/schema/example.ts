import { isObject } from "../json/read"
import type { SchemaNode, SchemaRef, SpecModel } from "../model"
import { getSchema } from "./get"
import { getMergedSchema, mergeAllOf } from "./merge"

export type ExampleOptions = {
  /** `request` leaves out readOnly properties, `response` leaves out writeOnly ones. */
  usage?: "request" | "response"
}

const STRING_FORMATS: Record<string, string> = {
  date: "2024-05-14",
  "date-time": "2024-05-14T09:30:00Z",
  time: "09:30:00Z",
  email: "ada@example.com",
  uuid: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  uri: "https://example.com",
  url: "https://example.com",
  hostname: "example.com",
  ipv4: "192.0.2.1",
  ipv6: "2001:db8::1",
}

const BY_FULL_NAME: Record<string, string> = {
  "first name": "Ada",
  "given name": "Ada",
  "last name": "Lovelace",
  "family name": "Lovelace",
  username: "ada",
  "user name": "ada",
}

const BY_LAST_WORD: Record<string, string> = {
  id: "usr_8f2k1q",
  name: "Ada Lovelace",
  email: "ada@example.com",
  url: "https://example.com",
  website: "https://example.com",
  phone: "+1 555 0100",
  city: "London",
  country: "GB",
}

/** `userId`, `user_id` and `user-id` all read as "user id". */
const wordsOf = (name: string) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)

const stringFromName = (name: string | undefined) => {
  if (!name) return undefined
  const words = wordsOf(name)
  return BY_FULL_NAME[words.join(" ")] ?? BY_LAST_WORD[words.at(-1) ?? ""]
}

const declaredValue = (node: SchemaNode) =>
  node.examples.length > 0
    ? node.examples[0]
    : node.const !== undefined
      ? node.const
      : node.default !== undefined
        ? node.default
        : node.enum?.[0]

/**
 * A plausible value for a schema: its example, default or first allowed value, else one from its
 * format, else one from the property name (`name` → "Ada Lovelace"), else "text", 0 or true.
 */
export const exampleFromSchema = (
  model: SpecModel,
  ref: SchemaRef,
  { usage = "request" }: ExampleOptions = {},
): unknown => {
  const hidden = (node: SchemaNode) => (usage === "request" ? node.readOnly : node.writeOnly)

  const build = (ref: SchemaRef, ancestors: ReadonlySet<string>, name?: string): unknown => {
    if (ancestors.has(ref.pointer)) return undefined
    const node = mergeAllOf(model, getSchema(model, ref), ancestors)
    const declared = declaredValue(node)
    if (declared !== undefined) return declared

    const inner = new Set([...ancestors, ref.pointer])
    const child = (schema: SchemaRef) => build(schema, inner)
    const sameName = (schema: SchemaRef) => build(schema, inner, name)
    const type = node.types.find((candidate) => candidate !== "null")

    if (node.allOf.length > 0) {
      const parts = [
        ...node.allOf.map(sameName),
        type === "object" ? objectOf(node, inner) : undefined,
      ]
      const objects = parts.filter(isObject)
      return objects.length > 0
        ? Object.assign({}, ...objects)
        : parts.find((part) => part !== undefined)
    }
    const choice = node.oneOf[0] ?? node.anyOf[0]
    if (choice && node.properties.length === 0) return sameName(choice)

    switch (type ?? (node.properties.length > 0 ? "object" : undefined)) {
      case "object":
        return objectOf(node, inner)
      case "array": {
        const item = node.items && child(node.items)
        return item === undefined ? [] : [item]
      }
      case "string":
        return (node.format && STRING_FORMATS[node.format]) ?? stringFromName(name) ?? "text"
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
        if (hidden(getMergedSchema(model, schema))) return []
        const value = build(schema, ancestors, name)
        return value === undefined ? [] : [[name, value]]
      }),
    )

  return build(ref, new Set())
}
