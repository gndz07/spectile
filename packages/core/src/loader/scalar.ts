import { bundle } from "@scalar/json-magic/bundle"
import { fetchUrls, parseJson, parseYaml } from "@scalar/json-magic/bundle/plugins/browser"
import { upgrade, validate } from "@scalar/openapi-parser"
import { appendPointer } from "../json/pointer"
import { isObject } from "../json/read"
import { issue } from "../json/refs"
import type { Issue, OpenAPIDocument } from "../model"

const pointerOf = (path: string | string[] | undefined) => {
  if (Array.isArray(path)) return appendPointer("#", ...path)
  if (!path) return "#"
  if (path.startsWith("#")) return path
  return path.startsWith("/") ? `#${path}` : `#/${path}`
}

export type FetchOptions = {
  /** Fetches the spec's URL and the URLs it refers to. Pass your own to allow only some hosts. */
  fetch?: typeof globalThis.fetch
  /** `false` fetches nothing: the input has to be text or an object, and refs to URLs stay unresolved. */
  resolveExternal?: boolean
}

export const bundleDocument = async (
  input: string | Record<string, unknown>,
  { fetch, resolveExternal = true }: FetchOptions = {},
) => {
  const issues: Issue[] = []
  const value = await bundle(typeof input === "string" ? input : structuredClone(input), {
    plugins: [...(resolveExternal ? [fetchUrls({ fetch })] : []), parseJson(), parseYaml()],
    treeShake: false,
    hooks: {
      onResolveError: (node) =>
        issues.push(issue("unresolved-ref", `Cannot load ${String(node.$ref)}`, "#")),
    },
  })
  return { value, issues }
}

export const upgradeDocument = (value: unknown): OpenAPIDocument | undefined => {
  if (!isObject(value)) return undefined
  const { specification } = upgrade(value)
  return isObject(specification) && typeof specification.openapi === "string"
    ? { ...specification, openapi: specification.openapi }
    : undefined
}

export const validateDocument = async (document: OpenAPIDocument): Promise<Issue[]> => {
  const { errors = [] } = await validate(structuredClone(document))
  return errors.map(({ message, path }) => issue("invalid-document", message, pointerOf(path)))
}
