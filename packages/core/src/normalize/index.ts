import { asArray, asString, isObject } from "../json/read"
import type { Info, NormalizedOperation, OpenAPIDocument, SpecModel, Tag } from "../model"
import type { Context } from "./context"
import { externalDocsOf } from "./external-docs"
import { normalizeOperations } from "./operations"
import { securitySchemes } from "./security"
import { defaultServers, serverList } from "./servers"

const infoOf = (value: unknown): Info => {
  const info = isObject(value) ? value : {}
  return {
    title: asString(info.title) ?? "",
    version: asString(info.version) ?? "",
    summary: asString(info.summary),
    description: asString(info.description),
  }
}

const tagList = (document: OpenAPIDocument, operations: NormalizedOperation[]): Tag[] => {
  const declared = asArray(document.tags)
    .filter(isObject)
    .flatMap((tag) => {
      const name = asString(tag.name)
      if (name === undefined) return []
      const description = asString(tag.description)
      return [{ name, description, externalDocs: externalDocsOf(tag.externalDocs) }]
    })
  const declaredNames = new Set(declared.map(({ name }) => name))
  const undeclared = [...new Set(operations.flatMap(({ tags }) => tags))]
    .filter((name) => !declaredNames.has(name))
    .map((name) => ({ name }))
  return [...declared, ...undeclared]
}

export const normalize = (document: OpenAPIDocument): SpecModel => {
  const context: Context = { document, issues: [] }
  const operations = normalizeOperations(context)
  return {
    document,
    info: infoOf(document.info),
    externalDocs: externalDocsOf(document.externalDocs),
    operations,
    tags: tagList(document, operations),
    securitySchemes: securitySchemes(context),
    servers: serverList(document.servers) ?? defaultServers(),
    warnings: context.issues,
  }
}
