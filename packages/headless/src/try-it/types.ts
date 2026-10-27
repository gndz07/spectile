import type { BodyField, Credential, FileLike, HttpRequest, Parameter } from "@spectile/core"

export type HttpResponse = {
  status: number
  statusText: string
  /** Names in lowercase. */
  headers: Record<string, string>
  /** The body as text; JSON is indented. Empty for binary responses, which come as `blob`. */
  body: string
  blob?: Blob
  /** Milliseconds from sending to the full body. */
  duration: number
  /** Bytes in the body as received. */
  size: number
}

export type TryItResult =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "done"; response: HttpResponse }
  /** `network` when no response came back, e.g. the browser blocked the request. */
  | { status: "error"; error: string; network?: true }

/** What the user typed for one operation. Parameter values are text, keyed by `parameterKey`. */
export type RequestDraft = {
  parameters: Record<string, string>
  /** The body as text, sent when it isn't filled in field by field. */
  body: string
  mediaType?: string
  /** Text for each typed body field, by property name. */
  fields: Record<string, string>
  /** The files chosen for each file field. */
  files: Record<string, FileLike[]>
}

export type ResponseLike = {
  status: number
  statusText: string
  headers: { forEach: (callback: (value: string, key: string) => void) => void }
  text: () => Promise<string>
  /** Used for binary responses when present. */
  blob?: () => Promise<Blob>
}

export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string | Blob; signal?: unknown },
) => Promise<ResponseLike>

/** `sessionStorage`, `localStorage` or anything with the same two methods. */
export type CredentialStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

export type TryItOptions = {
  /** Defaults to the global `fetch`. Pass your own to add a proxy, logging or test doubles. */
  fetch?: FetchLike
  /** Where the spec was loaded from. Relative server URLs like `/api/v3` resolve against it. */
  baseUrl?: string
  /** Keeps credentials here, so they survive a reload. Not kept when left out. */
  storage?: CredentialStorage
  /** Defaults to `spectile:credentials:` plus the spec's title. */
  storageKey?: string
}

export type TryItSettings = { credentials: Record<string, Credential> }

/** The chosen server and its variable values, shared by operations with the same servers. */
export type ServerSelection = {
  index: number
  variables: Record<string, string>
  /** Typed by hand; wins over the chosen server. */
  url?: string
}

export type OperationTryItSnapshot = {
  draft: RequestDraft
  result: TryItResult
  request: HttpRequest
  missing: Parameter[]
  /** One per property of a form or multipart body; empty when the body is edited as text. */
  bodyFields: BodyField[]
  missingFields: BodyField[]
  /** The body is required but empty. */
  missingBody: boolean
  /** Index into the operation's `servers`. */
  serverIndex: number
  /** The chosen server's variables with their current values. */
  serverVariables: Record<string, string>
  serverUrl: string
}

export type TryItState = TryItSettings & {
  drafts: Record<string, RequestDraft>
  results: Record<string, TryItResult>
  servers: Record<string, ServerSelection>
}
