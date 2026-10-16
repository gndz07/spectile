import { asString, isObject } from "../json/read"
import type { ExternalDocs } from "../model"

export const externalDocsOf = (value: unknown): ExternalDocs | undefined => {
  if (!isObject(value)) return undefined
  const url = asString(value.url)
  return url === undefined ? undefined : { url, description: asString(value.description) }
}
