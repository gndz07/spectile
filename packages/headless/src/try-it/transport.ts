import { type HttpRequest, formatResponseBody } from "@spectile/core";
import type { FetchLike, HttpResponse, ResponseLike, TryItResult } from "./types";

export type Controller = { signal?: unknown; abort: () => void };

const errorMessage = (error: unknown) => {
  if (error instanceof TypeError) {
    return `${error.message}. The server may be unreachable, or may not allow requests from this page (CORS).`;
  }
  return error instanceof Error ? error.message : String(error);
};

const toResponse = (response: ResponseLike, body: string, duration: number): HttpResponse => {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  const { status, statusText } = response;
  return {
    status,
    statusText,
    headers,
    body: formatResponseBody(body, headers["content-type"]),
    duration,
  };
};

export const createController = (): Controller => {
  const AbortControllerClass = (globalThis as { AbortController?: new () => Controller })
    .AbortController;
  return AbortControllerClass ? new AbortControllerClass() : { abort: () => {} };
};

export const globalFetch = () => (globalThis as { fetch?: FetchLike }).fetch;

/** Sends the request and settles as `done` or `error`; never rejects. */
export const fetchResult = async (
  fetchRequest: FetchLike,
  { url, ...init }: HttpRequest,
  signal?: unknown,
): Promise<TryItResult> => {
  const started = Date.now();
  try {
    const response = await fetchRequest(url, { ...init, signal });
    const body = await response.text();
    return { status: "done", response: toResponse(response, body, Date.now() - started) };
  } catch (error) {
    return { status: "error", error: errorMessage(error) };
  }
};
