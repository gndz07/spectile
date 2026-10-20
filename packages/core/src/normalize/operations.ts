import { appendPointer } from "../json/pointer"
import {
  asArray,
  asBoolean,
  asOptionalBoolean,
  asString,
  asStrings,
  entries,
  isOneOf,
} from "../json/read"
import { issue } from "../json/refs"
import {
  type Encoding,
  type Example,
  type Header,
  type HttpMethod,
  type MediaType,
  type NormalizedOperation,
  type OperationKind,
  type Parameter,
  type ParameterFields,
  type ParameterLocation,
  type RequestBody,
  type Response,
  type SchemaRef,
  parameterKey,
} from "../model"
import { schemaRef } from "../schema/get"
import { type Context, type Located, resolveObject } from "./context"
import { externalDocsOf } from "./external-docs"
import { securityRequirements } from "./security"
import { defaultServers, serverList } from "./servers"

type OperationDraft = Omit<NormalizedOperation, "id">

const METHODS: readonly HttpMethod[] = [
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace",
]

const isParameterLocation = isOneOf<ParameterLocation>(["query", "header", "path", "cookie"])

const schemaAt = (context: Context, owner: Located): SchemaRef | undefined =>
  owner.value.schema === undefined
    ? undefined
    : schemaRef(context.document, appendPointer(owner.pointer, "schema"))

const examplesOf = (context: Context, owner: Located): Example[] => {
  if ("example" in owner.value) return [{ name: "default", value: owner.value.example }]
  return entries(owner.value.examples).flatMap(([name]) => {
    const located = resolveObject(context, appendPointer(owner.pointer, "examples", name))
    if (!located) return []
    const { value } = located
    return [
      {
        name,
        summary: asString(value.summary),
        description: asString(value.description),
        value: value.value,
        externalValue: asString(value.externalValue),
      },
    ]
  })
}

const encodingOf = (context: Context, media: Located) => {
  const encoding = entries(media.value.encoding).flatMap(([name]) => {
    const located = resolveObject(context, appendPointer(media.pointer, "encoding", name))
    if (!located) return []
    const { value } = located
    const fields: Encoding = {
      contentType: asString(value.contentType),
      headers: headers(context, located),
      style: asString(value.style),
      explode: asOptionalBoolean(value.explode),
      allowReserved: asOptionalBoolean(value.allowReserved),
    }
    return [[name, fields] as const]
  })
  return encoding.length > 0 ? Object.fromEntries(encoding) : undefined
}

const mediaTypes = (context: Context, owner: Located): MediaType[] =>
  entries(owner.value.content).flatMap(([mediaType]) => {
    const located = resolveObject(context, appendPointer(owner.pointer, "content", mediaType))
    if (!located) return []
    const encoding = encodingOf(context, located)
    return [
      {
        mediaType,
        schema: schemaAt(context, located),
        examples: examplesOf(context, located),
        ...(encoding && { encoding }),
      },
    ]
  })

const parameterFields = (context: Context, located: Located): ParameterFields => ({
  description: asString(located.value.description),
  required: asBoolean(located.value.required),
  deprecated: asBoolean(located.value.deprecated),
  schema: schemaAt(context, located),
  content: mediaTypes(context, located),
  style: asString(located.value.style),
  explode: asOptionalBoolean(located.value.explode),
  allowReserved: asOptionalBoolean(located.value.allowReserved),
  examples: examplesOf(context, located),
})

/** The spec says header parameters with these names are ignored. */
const IGNORED_HEADERS = new Set(["accept", "content-type", "authorization"])

const parameter = (context: Context, located: Located): Parameter | undefined => {
  const name = asString(located.value.name)
  const location = located.value.in
  if (name === undefined || !isParameterLocation(location)) {
    context.issues.push(
      issue("invalid-parameter", "Parameter needs a name and a valid `in`", located.pointer),
    )
    return undefined
  }
  if (location === "header" && IGNORED_HEADERS.has(name.toLowerCase())) return undefined
  return {
    name,
    in: location,
    ...parameterFields(context, located),
    required: location === "path" || asBoolean(located.value.required),
  }
}

const parameterList = (context: Context, owner: Located): Parameter[] =>
  asArray(owner.value.parameters).flatMap((_, index) => {
    const located = resolveObject(context, appendPointer(owner.pointer, "parameters", index))
    return (located && parameter(context, located)) ?? []
  })

const mergeParameters = (pathLevel: Parameter[], operationLevel: Parameter[]) => {
  const overridden = new Set(operationLevel.map(parameterKey))
  return [...pathLevel.filter((p) => !overridden.has(parameterKey(p))), ...operationLevel]
}

const requestBody = (context: Context, pointer: string): RequestBody | undefined => {
  const located = resolveObject(context, pointer)
  if (!located) return undefined
  return {
    pointer: located.pointer,
    description: asString(located.value.description),
    required: asBoolean(located.value.required),
    content: mediaTypes(context, located),
  }
}

const headers = (context: Context, owner: Located): Header[] =>
  entries(owner.value.headers).flatMap(([name]) => {
    if (name.toLowerCase() === "content-type") return []
    const located = resolveObject(context, appendPointer(owner.pointer, "headers", name))
    return located ? [{ name, ...parameterFields(context, located) }] : []
  })

const responses = (context: Context, operation: Located): Response[] =>
  entries(operation.value.responses).flatMap(([status]) => {
    const located = resolveObject(context, appendPointer(operation.pointer, "responses", status))
    if (!located) return []
    return [
      {
        status,
        pointer: located.pointer,
        description: asString(located.value.description) ?? "",
        content: mediaTypes(context, located),
        headers: headers(context, located),
      },
    ]
  })

const SECTIONS: Record<OperationKind, string> = { operation: "paths", webhook: "webhooks" }

type PathItem = { kind: OperationKind; path: string; located: Located; parameters: Parameter[] }

/** The API sends webhooks, so the document's security and servers don't apply to them. */
const serversOf = (context: Context, { kind, located }: PathItem, operation: Located) =>
  kind === "webhook"
    ? []
    : (serverList(operation.value.servers) ??
      serverList(located.value.servers) ??
      serverList(context.document.servers) ??
      defaultServers())

const securityOf = (context: Context, { kind }: PathItem, operation: Located) =>
  securityRequirements(
    operation.value.security ?? (kind === "operation" ? context.document.security : undefined),
  )

const operationDraft = (
  context: Context,
  item: PathItem,
  method: HttpMethod,
  operation: Located,
): OperationDraft => ({
  kind: item.kind,
  operationId: asString(operation.value.operationId),
  method,
  path: item.path,
  pointer: operation.pointer,
  summary: asString(operation.value.summary),
  description: asString(operation.value.description),
  externalDocs: externalDocsOf(operation.value.externalDocs),
  tags: asStrings(operation.value.tags),
  deprecated: asBoolean(operation.value.deprecated),
  parameters: mergeParameters(item.parameters, parameterList(context, operation)),
  requestBody:
    operation.value.requestBody === undefined
      ? undefined
      : requestBody(context, appendPointer(operation.pointer, "requestBody")),
  responses: responses(context, operation),
  security: securityOf(context, item, operation),
  servers: serversOf(context, item, operation),
})

const pathOperations = (context: Context, kind: OperationKind, path: string): OperationDraft[] => {
  const located = resolveObject(context, appendPointer("#", SECTIONS[kind], path))
  if (!located) return []
  const item = { kind, path, located, parameters: parameterList(context, located) }
  return METHODS.flatMap((method) => {
    if (located.value[method] === undefined) return []
    const operation = resolveObject(context, appendPointer(located.pointer, method))
    return operation ? [operationDraft(context, item, method, operation)] : []
  })
}

const sectionOperations = (context: Context, kind: OperationKind) =>
  entries(context.document[SECTIONS[kind]]).flatMap(([path]) => pathOperations(context, kind, path))

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const uniqueId = (base: string, taken: (id: string) => boolean) => {
  let id = base
  for (let suffix = 2; taken(id); suffix++) id = `${base}-${suffix}`
  return id
}

const generatedId = ({ kind, method, path }: OperationDraft) =>
  kind === "webhook" ? `webhook ${method} ${path}` : `${method} ${path}`

/** Explicit operationIds are reserved first, so a generated id never takes one that comes later. */
const assignIds = (context: Context, drafts: OperationDraft[]): NormalizedOperation[] => {
  const reserved = new Set(drafts.flatMap(({ operationId }) => operationId ?? []))
  const used = new Set<string>()
  const taken = (id: string) => used.has(id) || reserved.has(id)
  return drafts.map((draft) => {
    const explicit = draft.operationId
    const id =
      explicit !== undefined && !used.has(explicit)
        ? explicit
        : uniqueId(explicit ?? slug(generatedId(draft)), taken)
    used.add(id)
    if (draft.operationId !== undefined && id !== draft.operationId) {
      context.issues.push(
        issue(
          "duplicate-operation-id",
          `operationId ${draft.operationId} is not unique, using ${id}`,
          draft.pointer,
        ),
      )
    }
    return { id, ...draft }
  })
}

/** Operations and webhooks share one id space, as the spec's operationIds do. */
export const normalizeOperations = (context: Context) => {
  const all = assignIds(context, [
    ...sectionOperations(context, "operation"),
    ...sectionOperations(context, "webhook"),
  ])
  const ofKind = (kind: OperationKind) => all.filter((operation) => operation.kind === kind)
  return { operations: ofKind("operation"), webhooks: ofKind("webhook") }
}
