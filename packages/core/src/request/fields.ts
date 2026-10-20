import type { MediaType, SchemaNode, SchemaProperty, SchemaRef, SpecModel } from "../model"
import { getSchema } from "../schema/get"
import { isFormMediaType, isMultipart } from "./media-type"
import { isEmptyValue } from "./parameters"

/** One property of a form or multipart body, filled in on its own. */
export type BodyField = {
  name: string
  required: boolean
  schema: SchemaRef
  /** Filled by choosing files instead of typing. */
  file: boolean
  /** Takes several values: a comma-separated list, or several files. */
  multiple: boolean
  /** The file types the field takes, for `<input type="file" accept>`. */
  accept?: string
}

const isBinary = (node: SchemaNode) =>
  node.format === "binary" ||
  node.format === "base64" ||
  node.contentMediaType !== undefined ||
  node.contentEncoding !== undefined

const isTextType = (contentType: string) =>
  /^text\/|[/+](json|xml)\b|x-www-form-urlencoded/i.test(contentType)

/** A binary string, or an untyped value whose encoding names a non-text type. */
const isFile = (node: SchemaNode, contentType?: string) =>
  isBinary(node) ||
  (node.types.length === 0 && contentType !== undefined && !isTextType(contentType))

/** Own properties after those of `allOf` parts, so own ones win. */
const propertiesOf = (
  model: SpecModel,
  ref: SchemaRef,
  ancestors: ReadonlySet<string> = new Set(),
): SchemaProperty[] => {
  if (ancestors.has(ref.pointer)) return []
  const node = getSchema(model, ref)
  const inner = new Set([...ancestors, ref.pointer])
  return [...node.allOf.flatMap((part) => propertiesOf(model, part, inner)), ...node.properties]
}

/** The fields of a form or multipart body with an object schema; empty for any other body. */
export const bodyFields = (
  model: SpecModel,
  { mediaType, schema, encoding = {} }: MediaType,
): BodyField[] => {
  if (!schema || !isFormMediaType(mediaType)) return []
  const properties = new Map(propertiesOf(model, schema).map((property) => [property.name, property]))
  return [...properties.values()].flatMap(({ name, required, schema: property }) => {
    const node = getSchema(model, property)
    if (node.readOnly) return []
    const items = node.types.includes("array") && node.items ? getSchema(model, node.items) : undefined
    const value = items ?? node
    const contentType = encoding[name]?.contentType
    const file = isMultipart(mediaType) && isFile(value, contentType)
    return [
      {
        name,
        required,
        schema: property,
        file,
        multiple: items !== undefined,
        accept: file ? (contentType ?? value.contentMediaType) : undefined,
      },
    ]
  })
}

export const missingFields = (fields: BodyField[], values: Record<string, unknown> = {}) =>
  fields.filter((field) => field.required && isEmptyValue(values[field.name]))
