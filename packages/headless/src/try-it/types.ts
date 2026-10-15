import type { Credential, HttpRequest, Parameter } from "@spectile/core";

export type HttpResponse = {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  /** Milliseconds from sending to the full body. */
  duration: number;
};

export type TryItResult =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "done"; response: HttpResponse }
  | { status: "error"; error: string };

/** What the user typed for one operation. Parameter values are text, keyed by `parameterKey`. */
export type RequestDraft = { parameters: Record<string, string>; body: string; mediaType?: string };

export type ResponseLike = {
  status: number;
  statusText: string;
  headers: { forEach: (callback: (value: string, key: string) => void) => void };
  text: () => Promise<string>;
};

export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string; signal?: unknown },
) => Promise<ResponseLike>;

export type TryItOptions = {
  /** Defaults to the global `fetch`. Pass your own to add a proxy, logging or test doubles. */
  fetch?: FetchLike;
  /** Where the spec was loaded from. Relative server URLs like `/api/v3` resolve against it. */
  baseUrl?: string;
};

export type TryItSettings = { credentials: Record<string, Credential> };

/** The chosen server and its variable values, shared by operations with the same servers. */
export type ServerSelection = {
  index: number;
  variables: Record<string, string>;
  /** Typed by hand; wins over the chosen server. */
  url?: string;
};

export type OperationTryItSnapshot = {
  draft: RequestDraft;
  result: TryItResult;
  request: HttpRequest;
  missing: Parameter[];
  /** Index into the operation's `servers`. */
  serverIndex: number;
  /** The chosen server's variables with their current values. */
  serverVariables: Record<string, string>;
  serverUrl: string;
};

export type TryItState = TryItSettings & {
  drafts: Record<string, RequestDraft>;
  results: Record<string, TryItResult>;
  servers: Record<string, ServerSelection>;
};
