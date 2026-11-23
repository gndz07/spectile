import type { Issue, OpenAPIDocument } from "../model"
import { type FetchOptions, bundleDocument, upgradeDocument, validateDocument } from "./scalar"

export type LoadInput = string | URL | Record<string, unknown>

export type LoadOptions = FetchOptions & { validate?: boolean }

export type LoadResult = { document: OpenAPIDocument; warnings: Issue[] }

export const loadSpec = async (
  input: LoadInput,
  { validate = true, ...fetchOptions }: LoadOptions = {},
): Promise<LoadResult> => {
  const bundled = await bundleDocument(input instanceof URL ? input.href : input, fetchOptions)
  const document = upgradeDocument(bundled.value)
  if (!document) throw new Error("Input is not a supported OpenAPI or Swagger document")
  const validation = validate ? await validateDocument(document) : []
  return { document, warnings: [...bundled.issues, ...validation] }
}
