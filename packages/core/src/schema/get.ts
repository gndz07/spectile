import { appendPointer, escapeSegment, unescapeSegment } from "../json/pointer"
import {
  type JsonObject,
  asArray,
  asOptionalBoolean,
  asString,
  entries,
  isObject,
  isOneOf,
  withoutUndefined,
} from "../json/read"
import { fromReferences, refOf } from "../json/refs"
import type {
  Constraints,
  Discriminator,
  NumericConstraint,
  OpenAPIDocument,
  SchemaAnnotations,
  SchemaNode,
  SchemaRef,
  SchemaType,
  SpecModel,
} from "../model"
import { cyclicPointers } from "./cycles"
import { SCHEMA_PREFIX, resolveSchema } from "./resolve"

const isSchemaType = isOneOf<SchemaType>([
  "string",
  "number",
  "integer",
  "boolean",
  "object",
  "array",
  "null",
])

const NUMERIC_CONSTRAINTS: readonly NumericConstraint[] = [
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minLength",
  "maxLength",
  "minItems",
  "maxItems",
  "minProperties",
  "maxProperties",
]

const schemaRefName = (pointer: string) => {
  if (!pointer.startsWith(SCHEMA_PREFIX)) return undefined
  const name = pointer.slice(SCHEMA_PREFIX.length)
  return name.includes("/") ? undefined : unescapeSegment(name)
}

const refTo = (document: OpenAPIDocument, target: string): SchemaRef => ({
  pointer: target,
  refName: schemaRefName(target),
  circular: cyclicPointers(document).has(target),
})

const annotationsOf = (schema: JsonObject): SchemaAnnotations =>
  withoutUndefined({
    title: asString(schema.title),
    description: asString(schema.description),
    deprecated: asOptionalBoolean(schema.deprecated),
    readOnly: asOptionalBoolean(schema.readOnly),
    writeOnly: asOptionalBoolean(schema.writeOnly),
    default: schema.default,
    examples: Array.isArray(schema.examples)
      ? schema.examples
      : "example" in schema
        ? [schema.example]
        : undefined,
  })

export const schemaRef = (document: OpenAPIDocument, pointer: string): SchemaRef => {
  const resolution = resolveSchema(document, pointer)
  const annotations = fromReferences(resolution.via, annotationsOf)
  const ref = refTo(document, resolution.pointer)
  return Object.keys(annotations).length > 0 ? { ...ref, annotations } : ref
}

const inferTypes = (schema: JsonObject): SchemaType[] => {
  if (isObject(schema.properties) || schema.additionalProperties !== undefined) return ["object"]
  return schema.items === undefined ? [] : ["array"]
}

const schemaTypes = (schema: JsonObject): SchemaType[] => {
  const declared = (Array.isArray(schema.type) ? schema.type : [schema.type]).filter(isSchemaType)
  const types = declared.length > 0 ? declared : inferTypes(schema)
  const addNull = schema.nullable === true && types.length > 0 && !types.includes("null")
  return addNull ? [...types, "null"] : types
}

const constraintsOf = (schema: JsonObject): Constraints => ({
  ...(Object.fromEntries(
    NUMERIC_CONSTRAINTS.flatMap((key) =>
      typeof schema[key] === "number" ? [[key, schema[key]] as const] : [],
    ),
  ) as { [K in NumericConstraint]?: number }),
  pattern: asString(schema.pattern),
  uniqueItems: schema.uniqueItems === true || undefined,
})

const discriminatorOf = (document: OpenAPIDocument, value: unknown): Discriminator | undefined => {
  if (!isObject(value) || typeof value.propertyName !== "string") return undefined
  const mapping = entries(value.mapping).flatMap(([key, target]) => {
    if (typeof target !== "string") return []
    const pointer = target.startsWith("#") ? target : SCHEMA_PREFIX + escapeSegment(target)
    return [[key, schemaRef(document, pointer)] as const]
  })
  return { propertyName: value.propertyName, mapping: Object.fromEntries(mapping) }
}

/** The schema at a pointer, or behind a ref, with any annotations written next to its `$ref` applied. */
export const getSchema = (model: SpecModel, ref: string | SchemaRef): SchemaNode => {
  const { document } = model
  const { pointer, annotations } = typeof ref === "string" ? { pointer: ref } : ref
  const resolution = resolveSchema(document, pointer)
  const schema = isObject(resolution.value) ? resolution.value : {}
  const extended = refOf(schema)
  const child = (...segments: (string | number)[]) =>
    schemaRef(document, appendPointer(resolution.pointer, ...segments))
  const optionalChild = (key: string) => (isObject(schema[key]) ? child(key) : undefined)
  const childList = (key: string) => asArray(schema[key]).map((_, index) => child(key, index))
  const required = new Set(asArray(schema.required))

  return {
    ...refTo(document, resolution.pointer),
    types: schemaTypes(schema),
    format: asString(schema.format),
    deprecated: false,
    readOnly: false,
    writeOnly: false,
    examples: [],
    ...annotationsOf(schema),
    ...fromReferences(resolution.via, annotationsOf),
    ...annotations,
    enum: Array.isArray(schema.enum) ? schema.enum : undefined,
    const: schema.const,
    constraints: constraintsOf(schema),
    properties: entries(schema.properties).map(([name]) => ({
      name,
      required: required.has(name),
      schema: child("properties", name),
    })),
    additionalProperties:
      typeof schema.additionalProperties === "boolean"
        ? schema.additionalProperties
        : optionalChild("additionalProperties"),
    items: optionalChild("items"),
    allOf: [
      ...(extended === undefined ? [] : [schemaRef(document, extended)]),
      ...childList("allOf"),
    ],
    oneOf: childList("oneOf"),
    anyOf: childList("anyOf"),
    not: optionalChild("not"),
    discriminator: discriminatorOf(document, schema.discriminator),
    issue: resolution.issue,
  }
}
