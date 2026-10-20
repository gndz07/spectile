import { isObject } from "../json/read"
import type { MediaType, Parameter, SchemaRef, SpecModel } from "../model"
import { exampleFromSchema } from "../schema/example"
import { getSchema } from "../schema/get"
import { bodyFields } from "./fields"
import { isJsonMediaType } from "./media-type"
import { toText } from "./parameters"

const inputText = (value: unknown) => {
  if (value === undefined || value === null) return ""
  return Array.isArray(value) ? value.map(toText).join(",") : toText(value)
}

/** The parameter's example, default or first enum value, as text for an input. */
export const parameterExample = (model: SpecModel, parameter: Parameter) => {
  const node = parameter.schema && getSchema(model, parameter.schema)
  return inputText(
    parameter.examples[0]?.value ?? node?.examples[0] ?? node?.default ?? node?.enum?.[0],
  )
}

const mediaExample = (model: SpecModel, { schema, examples }: MediaType) =>
  examples[0]?.value ?? (schema && exampleFromSchema(model, schema))

export const bodyExample = (model: SpecModel, media: MediaType) => {
  const value = mediaExample(model, media)
  if (value === undefined) return ""
  return isJsonMediaType(media.mediaType) || typeof value !== "string"
    ? JSON.stringify(value, null, 2)
    : value
}

/** Text for each of the body's typed fields (see `bodyFields`), from its example. */
export const fieldExamples = (model: SpecModel, media: MediaType): Record<string, string> => {
  const example = mediaExample(model, media)
  const values = isObject(example) ? example : {}
  return Object.fromEntries(
    bodyFields(model, media)
      .filter((field) => !field.file)
      .map((field) => [field.name, inputText(values[field.name])]),
  )
}

/** Turns typed text into the value a schema expects: comma-separated arrays, JSON objects. */
export const parseSchemaInput = (model: SpecModel, schema: SchemaRef | undefined, text: string) => {
  const types = schema ? getSchema(model, schema).types : []
  if (types.includes("array")) {
    return text
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  }
  if (types.includes("object")) {
    try {
      return JSON.parse(text) as unknown
    } catch {
      return text
    }
  }
  return text
}

export const parseParameterInput = (model: SpecModel, parameter: Parameter, text: string) =>
  parseSchemaInput(model, parameter.schema, text)
