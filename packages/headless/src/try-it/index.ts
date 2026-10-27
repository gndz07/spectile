import { type Credential, type SpecModel, findOperation } from "@spectile/core"
import { createStore, memoizeLast } from "../store"
import { createInitialDrafts } from "./draft"
import { credentialProps } from "./props"
import { type SessionContext, createSession } from "./session"
import { EMPTY_STATE, withCredential } from "./state"
import { readCredentials, writeCredentials } from "./storage"
import type { TryItOptions, TryItSettings, TryItState } from "./types"

export type {
  CredentialStorage,
  FetchLike,
  HttpResponse,
  OperationTryItSnapshot,
  RequestDraft,
  ResponseLike,
  ServerSelection,
  TryItOptions,
  TryItResult,
  TryItSettings,
} from "./types"
export { initialDraft } from "./draft"
export { formatBytes, formatDuration } from "./format"
export { selectedServerUrl, serverListKey } from "./servers"

export type OperationTryIt = ReturnType<typeof createSession>

export const createTryIt = (model: SpecModel, options: TryItOptions = {}) => {
  const { storage, storageKey = `spectile:credentials:${model.info.title}` } = options
  const store = createStore<TryItState>({
    ...EMPTY_STATE,
    credentials: storage ? readCredentials(storage, storageKey) : {},
  })
  if (storage) {
    const saved = memoizeLast((credentials: TryItState["credentials"]) =>
      writeCredentials(storage, storageKey, credentials),
    )
    saved(store.getSnapshot().credentials)
    store.subscribe(() => saved(store.getSnapshot().credentials))
  }
  const context: SessionContext = {
    model,
    options,
    store,
    controllers: new Map(),
    initialDrafts: createInitialDrafts(model),
  }

  const setCredential = (name: string, credential: Credential | undefined) =>
    store.setState((state) => withCredential(state, name, credential))

  const settingsFor = memoizeLast((credentials: Record<string, Credential>): TryItSettings => ({
    credentials,
  }))

  const getSnapshot = () => settingsFor(store.getSnapshot().credentials)

  const getCredentialProps = credentialProps(() => store.getSnapshot().credentials, setCredential)

  const sessions = new Map<string, OperationTryIt>()

  const forOperation = (id: string) => {
    const existing = sessions.get(id)
    if (existing) return existing
    const operation = findOperation(model, id)
    if (!operation) throw new Error(`Unknown operation ${id}`)
    const session = createSession(context, operation)
    sessions.set(id, session)
    return session
  }

  return {
    getSnapshot,
    subscribe: store.subscribe,
    setCredential,
    getCredentialProps,
    forOperation,
  }
}

export type TryIt = ReturnType<typeof createTryIt>
