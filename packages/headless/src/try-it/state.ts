import type { Credential } from "@spectile/core"
import { patched, withEntry, withoutEntry } from "../store"
import type { RequestDraft, ServerSelection, TryItResult, TryItState } from "./types"

export const EMPTY_STATE: TryItState = { credentials: {}, drafts: {}, results: {}, servers: {} }

export const withCredential = (
  state: TryItState,
  name: string,
  credential: Credential | undefined,
): TryItState =>
  patched(state, {
    credentials:
      credential === undefined
        ? withoutEntry(state.credentials, name)
        : withEntry(state.credentials, name, credential),
  })

export const withDraft = (state: TryItState, id: string, draft: RequestDraft): TryItState =>
  patched(state, { drafts: withEntry(state.drafts, id, draft) })

export const withResult = (state: TryItState, id: string, result: TryItResult): TryItState =>
  patched(state, { results: withEntry(state.results, id, result) })

export const withSelection = (
  state: TryItState,
  serverKey: string,
  selection: ServerSelection,
): TryItState => patched(state, { servers: withEntry(state.servers, serverKey, selection) })

export const withoutOperation = (state: TryItState, id: string): TryItState =>
  patched(state, {
    drafts: withoutEntry(state.drafts, id),
    results: withoutEntry(state.results, id),
  })
