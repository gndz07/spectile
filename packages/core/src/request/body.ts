import { isObject } from "../json/read"
import type { Encoding } from "../model"
import { isFormMediaType, isMultipart, isUrlEncoded } from "./media-type"
import { serializeFormParameter, toText } from "./parameters"

/** A `File`, described by shape so core needs no DOM types. */
export type FileLike = {
  readonly name: string
  readonly type: string
  readonly size: number
  slice: (...args: never[]) => unknown
}

export type FormPart = { name: string; value: string | FileLike; contentType?: string }

/** Text and files, in order; `new Blob(chunks)` joins them. */
export type BodyChunk = string | FileLike

/** Text, or form values by property name. */
export type RequestBodyValue = string | Record<string, unknown>

export type EncodedBody = { body: string | BodyChunk[]; contentType?: string; form?: FormPart[] }

export const isFileLike = (value: unknown): value is FileLike =>
  isObject(value) &&
  typeof value.name === "string" &&
  typeof value.size === "number" &&
  typeof value.slice === "function"

const jsonObject = (text: string) => {
  try {
    const value: unknown = JSON.parse(text)
    return isObject(value) ? value : undefined
  } catch {
    return undefined
  }
}

const presentEntries = (value: Record<string, unknown>) =>
  Object.entries(value).filter(([, item]) => item !== undefined && item !== null)

const urlEncoded = (value: Record<string, unknown>, encoding: Record<string, Encoding>) =>
  presentEntries(value)
    .flatMap(([name, item]) => serializeFormParameter({ ...encoding[name], name }, item))
    .join("&")

/** Lists and ranges such as `image/*` leave the type to the file. */
const singleContentType = (contentType?: string) =>
  contentType && !/[*,]/.test(contentType) ? contentType : undefined

const formPart = (name: string, value: unknown, declared?: string): FormPart =>
  isFileLike(value)
    ? { name, value, contentType: value.type || declared || "application/octet-stream" }
    : { name, value: toText(value), ...(declared && { contentType: declared }) }

/** Arrays become repeated parts; objects become JSON. */
const formParts = (value: Record<string, unknown>, encoding: Record<string, Encoding>) =>
  presentEntries(value).flatMap(([name, item]) => {
    const declared = singleContentType(encoding[name]?.contentType)
    return (Array.isArray(item) ? item : [item]).map((each) => formPart(name, each, declared))
  })

const textOf = ({ name, value }: FormPart) =>
  `${name}\n${typeof value === "string" ? value : value.name}`

/** File contents can't be read synchronously, so only names and text are checked. */
const boundaryFor = (parts: FormPart[]) => {
  const content = parts.map(textOf).join("\n")
  let boundary = "spectile-boundary"
  for (let suffix = 1; content.includes(boundary); suffix++) boundary = `spectile-boundary-${suffix}`
  return boundary
}

const quoted = (value: string) =>
  `"${value.replaceAll('"', "%22").replaceAll("\r", "%0D").replaceAll("\n", "%0A")}"`

const partHead = ({ name, value, contentType }: FormPart, boundary: string) => {
  const filename = typeof value === "string" ? "" : `; filename=${quoted(value.name)}`
  const type = contentType ? `Content-Type: ${contentType}\r\n` : ""
  return `--${boundary}\r\nContent-Disposition: form-data; name=${quoted(name)}${filename}\r\n${type}\r\n`
}

const multipart = (
  value: Record<string, unknown>,
  mediaType: string | undefined,
  encoding: Record<string, Encoding>,
): EncodedBody => {
  const form = formParts(value, encoding)
  const boundary = boundaryFor(form)
  const chunks: BodyChunk[] = [
    ...form.flatMap((part) => [partHead(part, boundary), part.value, "\r\n"]),
    `--${boundary}--\r\n`,
  ]
  return {
    body: chunks.every((chunk) => typeof chunk === "string") ? chunks.join("") : chunks,
    contentType: `${mediaType}; boundary=${boundary}`,
    form,
  }
}

/** Form bodies are encoded from their values, or from JSON text; any other text is sent as typed. */
export const encodeBody = (
  input: RequestBodyValue,
  mediaType?: string,
  encoding: Record<string, Encoding> = {},
): EncodedBody => {
  if (typeof input === "string") {
    const value = isFormMediaType(mediaType) ? jsonObject(input) : undefined
    return value ? encodeBody(value, mediaType, encoding) : { body: input, contentType: mediaType }
  }
  if (isMultipart(mediaType)) return multipart(input, mediaType, encoding)
  if (isUrlEncoded(mediaType)) return { body: urlEncoded(input, encoding), contentType: mediaType }
  return { body: JSON.stringify(input), contentType: mediaType }
}
