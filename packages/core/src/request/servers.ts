import type { Server } from "../model"
import { fillTemplate } from "./template"

export const resolveServerUrl = ({ url, variables }: Server, values: Record<string, string> = {}) =>
  fillTemplate(url, (name) => values[name] ?? variables[name]?.default)

/** Every variable of the server, with the given value or its default. */
export const serverVariableValues = (server: Server | undefined, values: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(server?.variables ?? {}).map(([name, { default: fallback }]) => [
      name,
      values[name] ?? fallback,
    ]),
  )

/** Resolves relative URLs like `/api/v3` against `baseUrl`, e.g. where the spec was loaded from. */
export const absoluteUrl = (url: string, baseUrl?: string) => {
  const UrlClass = (globalThis as { URL?: new (url: string, base: string) => { href: string } }).URL
  if (!baseUrl || !UrlClass) return url
  try {
    return new UrlClass(url, baseUrl).href
  } catch {
    return url
  }
}
