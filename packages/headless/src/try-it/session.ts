import {
  type Credential,
  type FileLike,
  type NormalizedOperation,
  type SpecModel,
  bodyFields,
  buildRequest,
  missingFields,
  missingParameters,
  serverVariableValues,
} from "@spectile/core"
import { type Store, memoizeLast } from "../store"
import {
  type createInitialDrafts,
  parseDraftFields,
  parseDraftParameters,
  requestMedia,
  withBody,
  withField,
  withFiles,
  withMediaType,
  withParameter,
} from "./draft"
import { operationProps } from "./props"
import {
  FIRST_SERVER,
  chooseServer,
  selectedServerUrl,
  serverListKey,
  withServerUrl,
  withServerVariable,
} from "./servers"
import { withDraft, withResult, withSelection, withoutOperation } from "./state"
import { type Controller, createController, fetchResult, globalFetch } from "./transport"
import type {
  OperationTryItSnapshot,
  RequestDraft,
  ServerSelection,
  TryItOptions,
  TryItResult,
  TryItState,
} from "./types"

/** What every operation's session shares. */
export type SessionContext = {
  model: SpecModel
  options: TryItOptions
  store: Store<TryItState>
  controllers: Map<string, Controller>
  initialDrafts: ReturnType<typeof createInitialDrafts>
}

const IDLE: TryItResult = { status: "idle" }
const PENDING: TryItResult = { status: "pending" }

const missingMessage = (kind: string, missing: { name: string }[]) =>
  missing.length === 0
    ? []
    : [`Missing required ${kind}: ${missing.map(({ name }) => name).join(", ")}`]

export const createSession = (
  { model, options, store, controllers, initialDrafts }: SessionContext,
  operation: NormalizedOperation,
) => {
  const { id, servers } = operation
  const serverKey = serverListKey(servers)
  const selectionOf = (state: TryItState) => state.servers[serverKey] ?? FIRST_SERVER
  const draftOf = (state: TryItState) => state.drafts[id] ?? initialDrafts.get(operation)
  const fieldsFor = memoizeLast((mediaType?: string) => {
    const media = requestMedia(operation, mediaType)
    return media ? bodyFields(model, media) : []
  })

  const snapshotFor = memoizeLast(
    (
      draft: RequestDraft,
      result: TryItResult,
      selection: ServerSelection,
      credentials: Record<string, Credential>,
    ): OperationTryItSnapshot => {
      const parameters = parseDraftParameters(model, operation, draft.parameters)
      const fields = fieldsFor(draft.mediaType)
      const fieldValues = parseDraftFields(model, fields, draft)
      const serverUrl = selectedServerUrl(servers, selection, options.baseUrl)
      return {
        draft,
        result,
        request: buildRequest(model, operation, {
          serverUrl,
          credentials,
          parameters,
          body: fields.length > 0 ? fieldValues : draft.body,
          mediaType: draft.mediaType,
        }),
        missing: missingParameters(operation, parameters),
        bodyFields: fields,
        missingFields: missingFields(fields, fieldValues),
        serverIndex: selection.index,
        serverVariables: serverVariableValues(servers[selection.index], selection.variables),
        serverUrl,
      }
    },
  )

  const getSnapshot = () => {
    const state = store.getSnapshot()
    return snapshotFor(
      draftOf(state),
      state.results[id] ?? IDLE,
      selectionOf(state),
      state.credentials,
    )
  }

  const updateSelection = (change: (selection: ServerSelection) => ServerSelection) =>
    store.setState((state) => withSelection(state, serverKey, change(selectionOf(state))))

  const updateDraft = (change: (draft: RequestDraft) => RequestDraft) =>
    store.setState((state) => withDraft(state, id, change(draftOf(state))))

  const setResult = (result: TryItResult) =>
    store.setState((state) => withResult(state, id, result))

  const selectServer = (index: number) => updateSelection(() => chooseServer(index))

  const setServerVariable = (name: string, value: string) =>
    updateSelection((selection) => withServerVariable(selection, name, value))

  const setServerUrl = (url: string) =>
    updateSelection((selection) => withServerUrl(selection, url))

  const setParameter = (key: string, value: string) =>
    updateDraft((draft) => withParameter(draft, key, value))

  const setBody = (body: string) => updateDraft((draft) => withBody(draft, body))

  const setField = (name: string, text: string) =>
    updateDraft((draft) => withField(draft, name, text))

  const setFiles = (name: string, files: FileLike[]) =>
    updateDraft((draft) => withFiles(draft, name, files))

  const setMediaType = (mediaType: string) =>
    updateDraft((draft) => withMediaType(model, operation, draft, mediaType))

  const cancel = () => {
    const controller = controllers.get(id)
    if (!controller) return
    controllers.delete(id)
    controller.abort()
    setResult(IDLE)
  }

  const send = async () => {
    const { request, missing, missingFields } = getSnapshot()
    const problems = [
      ...missingMessage("parameters", missing),
      ...missingMessage("fields", missingFields),
    ]
    if (problems.length > 0) return setResult({ status: "error", error: problems.join(". ") })
    const fetchRequest = options.fetch ?? globalFetch()
    if (!fetchRequest) return setResult({ status: "error", error: "fetch is not available" })

    controllers.get(id)?.abort()
    const controller = createController()
    controllers.set(id, controller)
    setResult(PENDING)
    const result = await fetchResult(fetchRequest, request, controller.signal)
    if (controllers.get(id) !== controller) return
    controllers.delete(id)
    setResult(result)
  }

  const reset = () => {
    cancel()
    initialDrafts.forget(id)
    store.setState((state) => withoutOperation(state, id))
  }

  const actions = {
    getSnapshot,
    setParameter,
    setBody,
    setField,
    setFiles,
    setMediaType,
    selectServer,
    setServerVariable,
    setServerUrl,
    send,
    cancel,
    reset,
  }

  return { ...actions, subscribe: store.subscribe, ...operationProps(actions) }
}
