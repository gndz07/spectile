import { type HttpRequest, formatResponseBody, isTextMediaType } from "@spectile/core"
import type { FetchLike, ResponseLike, TryItResult } from "./types"

export type Controller = { signal?: unknown; abort: () => void }

const errorMessage = (error: unknown) => {
  if (error instanceof TypeError) {
    return `${error.message}. The server may be unreachable, or may not allow requests from this page (CORS).`
  }
  return error instanceof Error ? error.message : String(error)
}

const readHeaders = (response: ResponseLike) => {
  const headers: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value
  })
  return headers
}

const readBody = async (response: ResponseLike, contentType?: string) =>
  !isTextMediaType(contentType) && response.blob
    ? { body: "", blob: await response.blob() }
    : { body: formatResponseBody(await response.text(), contentType) }

export const createController = (): Controller => {
  const AbortControllerClass = (globalThis as { AbortController?: new () => Controller })
    .AbortController
  return AbortControllerClass ? new AbortControllerClass() : { abort: () => {} }
}

export const globalFetch = () => (globalThis as { fetch?: FetchLike }).fetch

const fetchBody = (body: HttpRequest["body"]) =>
  Array.isArray(body) ? new Blob(body as unknown as Blob[]) : body

/** Sends the request and settles as `done` or `error`; never rejects. */
export const fetchResult = async (
  fetchRequest: FetchLike,
  { url, method, headers, body }: HttpRequest,
  signal?: unknown,
): Promise<TryItResult> => {
  const started = Date.now()
  try {
    const response = await fetchRequest(url, { method, headers, body: fetchBody(body), signal })
    const received = readHeaders(response)
    const content = await readBody(response, received["content-type"])
    const { status, statusText } = response
    return {
      status: "done",
      response: {
        status,
        statusText,
        headers: received,
        ...content,
        duration: Date.now() - started,
      },
    }
  } catch (error) {
    return { status: "error", error: errorMessage(error) }
  }
}
