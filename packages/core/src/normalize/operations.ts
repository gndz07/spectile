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
  type Example,
  type Header,
  type HttpMethod,
  type MediaType,
  type NormalizedOperation,
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

const mediaTypes = (context: Context, owner: Located): MediaType[] =>
  entries(owner.value.content).flatMap(([mediaType]) => {
    const located = resolveObject(context, appendPointer(owner.pointer, "content", mediaType))
    if (!located) return []
    return [
      {
        mediaType,
        schema: schemaAt(context, located),
        examples: examplesOf(context, located),
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
  examples: examplesOf(context, located),
})

const parameter = (context: Context, located: Located): Parameter | undefined => {
  const name = asString(located.value.name)
  const location = located.value.in
  if (name === undefined || !isParameterLocation(location)) {
    context.issues.push(
      issue("invalid-parameter", "Parameter needs a name and a valid `in`", located.pointer),
    )
    return undefined
  }
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

const operationDraft = (
  context: Context,
  path: string,
  method: HttpMethod,
  pathItem: Located,
  pathParameters: Parameter[],
  operation: Located,
): OperationDraft => ({
  operationId: asString(operation.value.operationId),
  method,
  path,
  pointer: operation.pointer,
  summary: asString(operation.value.summary),
  description: asString(operation.value.description),
  externalDocs: externalDocsOf(operation.value.externalDocs),
  tags: asStrings(operation.value.tags),
  deprecated: asBoolean(operation.value.deprecated),
  parameters: mergeParameters(pathParameters, parameterList(context, operation)),
  requestBody:
    operation.value.requestBody === undefined
      ? undefined
      : requestBody(context, appendPointer(operation.pointer, "requestBody")),
  responses: responses(context, operation),
  security: securityRequirements(operation.value.security ?? context.document.security),
  servers:
    serverList(operation.value.servers) ??
    serverList(pathItem.value.servers) ??
    serverList(context.document.servers) ??
    defaultServers(),
})

const pathOperations = (context: Context, path: string): OperationDraft[] => {
  const pathItem = resolveObject(context, appendPointer("#", "paths", path))
  if (!pathItem) return []
  const pathParameters = parameterList(context, pathItem)
  return METHODS.flatMap((method) => {
    if (pathItem.value[method] === undefined) return []
    const operation = resolveObject(context, appendPointer(pathItem.pointer, method))
    return operation
      ? [operationDraft(context, path, method, pathItem, pathParameters, operation)]
      : []
  })
}

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const uniqueId = (base: string, used: ReadonlySet<string>) => {
  let id = base
  for (let suffix = 2; used.has(id); suffix++) id = `${base}-${suffix}`
  return id
}

const assignIds = (context: Context, drafts: OperationDraft[]): NormalizedOperation[] => {
  const used = new Set<string>()
  return drafts.map((draft) => {
    const id = uniqueId(draft.operationId ?? slug(`${draft.method} ${draft.path}`), used)
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

export const normalizeOperations = (context: Context): NormalizedOperation[] =>
  assignIds(
    context,
    entries(context.document.paths).flatMap(([path]) => pathOperations(context, path)),
  )
