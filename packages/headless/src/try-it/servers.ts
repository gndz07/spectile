import { type Server, absoluteUrl, resolveServerUrl } from "@spectile/core"
import { patched, withEntry } from "../store"
import type { ServerSelection } from "./types"

export const FIRST_SERVER: ServerSelection = { index: 0, variables: {} }

/** Operations whose server lists have the same URLs share one selection. */
export const serverListKey = (servers: readonly Server[]) =>
  JSON.stringify(servers.map(({ url }) => url))

/** A typed URL left blank falls back to the chosen server, so requests never go out without a base. */
export const selectedServerUrl = (
  servers: readonly Server[],
  { index, variables, url }: ServerSelection,
  baseUrl?: string,
) => {
  if (url?.trim()) return url
  const server = servers[index]
  return server ? absoluteUrl(resolveServerUrl(server, variables), baseUrl) : ""
}

/** Choosing another server starts from its default variables; choosing the current one changes nothing. */
export const chooseServer = (selection: ServerSelection, index: number): ServerSelection =>
  selection.index === index && selection.url === undefined
    ? selection
    : { index, variables: {} }

/** Also drops a typed URL, so the chosen server is used again. */
export const withServerVariable = (
  selection: ServerSelection,
  name: string,
  value: string,
): ServerSelection =>
  selection.url === undefined && selection.variables[name] === value
    ? selection
    : { index: selection.index, variables: withEntry(selection.variables, name, value) }

export const withServerUrl = (selection: ServerSelection, url: string) =>
  patched(selection, { url })
