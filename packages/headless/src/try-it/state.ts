import type { Credential } from "@spectile/core"
import type { RequestDraft, ServerSelection, TryItResult, TryItState } from "./types"

export const EMPTY_STATE: TryItState = { credentials: {}, drafts: {}, results: {}, servers: {} }

const without = <T>(record: Record<string, T>, key: string) =>
  Object.fromEntries(Object.entries(record).filter(([candidate]) => candidate !== key))

export const withCredential = (
  state: TryItState,
  name: string,
  credential: Credential | undefined,
): TryItState => ({
  ...state,
  credentials:
    credential === undefined
      ? without(state.credentials, name)
      : { ...state.credentials, [name]: credential },
})

export const withDraft = (state: TryItState, id: string, draft: RequestDraft): TryItState => ({
  ...state,
  drafts: { ...state.drafts, [id]: draft },
})

export const withResult = (state: TryItState, id: string, result: TryItResult): TryItState => ({
  ...state,
  results: { ...state.results, [id]: result },
})

export const withSelection = (
  state: TryItState,
  serverKey: string,
  selection: ServerSelection,
): TryItState => ({ ...state, servers: { ...state.servers, [serverKey]: selection } })

export const withoutOperation = (state: TryItState, id: string): TryItState => ({
  ...state,
  drafts: without(state.drafts, id),
  results: without(state.results, id),
})
