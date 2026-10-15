import type { JsonObject } from "../json/read"
import { resolvePointer } from "../json/refs"

export const SCHEMA_PREFIX = "#/components/schemas/"

const NON_STRUCTURAL_KEYS = new Set([
  "$ref",
  "$comment",
  "$id",
  "$schema",
  "$anchor",
  "$dynamicAnchor",
  "title",
  "description",
  "deprecated",
  "readOnly",
  "writeOnly",
  "default",
  "examples",
  "example",
  "externalDocs",
  "xml",
])

/** A `$ref` with keywords of its own (e.g. extra `properties`) is a schema that also matches its target. */
const extendsRef = (schema: JsonObject) =>
  Object.keys(schema).some((key) => !NON_STRUCTURAL_KEYS.has(key) && !key.startsWith("x-"))

export const resolveSchema = (document: unknown, pointer: string) =>
  resolvePointer(document, pointer, extendsRef)
