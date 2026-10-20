import {
  type NormalizedOperation,
  type Parameter,
  type ParameterLocation,
  type SpecModel,
  parameterKey,
} from "../model"
import { type Credential, applySecurity } from "./auth"
import { type BodyChunk, type FormPart, type RequestBodyValue, encodeBody } from "./body"
import {
  isEmptyValue,
  serializeFormParameter,
  serializeHeaderParameter,
  serializePathParameter,
} from "./parameters"
import { fillTemplate } from "./template"

export type RequestInput = {
  /** The base URL, e.g. from `resolveServerUrl`. */
  serverUrl?: string
  /** Values by `parameterKey(parameter)`. Arrays and objects are serialized with the parameter's style. */
  parameters?: Record<string, unknown>
  /** Text, or for form and multipart bodies, values by property name (files included). */
  body?: RequestBodyValue
  mediaType?: string
  /** Credentials by security scheme name. */
  credentials?: Record<string, Credential>
}

export type HttpRequest = {
  method: string
  url: string
  headers: Record<string, string>
  /** Chunks of text and files when a multipart body holds files; send `new Blob(body)`. */
  body?: string | BodyChunk[]
  /** The parts of a `multipart/form-data` body, also encoded in `body`. */
  form?: FormPart[]
}

const hasBody = (body?: RequestBodyValue): body is RequestBodyValue =>
  typeof body === "string" ? body !== "" : body !== undefined && Object.keys(body).length > 0

export const missingParameters = (
  operation: NormalizedOperation,
  values: Record<string, unknown> = {},
): Parameter[] =>
  operation.parameters.filter(
    (parameter) => parameter.required && isEmptyValue(values[parameterKey(parameter)]),
  )

export const buildRequest = (
  model: Pick<SpecModel, "securitySchemes">,
  operation: NormalizedOperation,
  { serverUrl = "", parameters = {}, body, mediaType, credentials = {} }: RequestInput = {},
): HttpRequest => {
  const provided = operation.parameters.flatMap((parameter) => {
    const value = parameters[parameterKey(parameter)]
    return isEmptyValue(value) ? [] : [{ parameter, value }]
  })
  const located = (location: ParameterLocation) =>
    provided.filter(({ parameter }) => parameter.in === location)
  const auth = applySecurity(model.securitySchemes, operation.security, credentials)

  const path = fillTemplate(operation.path, (name) => {
    const found = located("path").find(({ parameter }) => parameter.name === name)
    return found && serializePathParameter(found.parameter, found.value)
  })
  const query = [
    ...located("query").flatMap(({ parameter, value }) => serializeFormParameter(parameter, value)),
    ...auth.query,
  ].join("&")
  const cookie = [
    ...located("cookie").flatMap(({ parameter, value }) =>
      serializeFormParameter(parameter, value),
    ),
    ...auth.cookies,
  ].join("; ")
  const media = operation.requestBody?.content.find(
    (candidate) => candidate.mediaType === mediaType,
  )
  const encoded =
    operation.requestBody && hasBody(body)
      ? encodeBody(body, mediaType, media?.encoding)
      : undefined

  const headers = Object.fromEntries([
    ...located("header").map(({ parameter, value }) => [
      parameter.name,
      serializeHeaderParameter(parameter, value),
    ]),
    ...auth.headers,
    ...(cookie ? [["Cookie", cookie]] : []),
    ...(encoded?.contentType ? [["Content-Type", encoded.contentType]] : []),
  ])

  return {
    method: operation.method.toUpperCase(),
    url: `${serverUrl.replace(/\/+$/, "")}${path}${query ? `?${query}` : ""}`,
    headers,
    ...(encoded && { body: encoded.body }),
    ...(encoded?.form && { form: encoded.form }),
  }
}
