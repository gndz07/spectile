import {
  type NormalizedOperation,
  type SpecModel,
  bodyExample,
  parameterExample,
  parameterKey,
  parseParameterInput,
} from "@spectile/core"
import type { RequestDraft } from "./types"

export const initialDraft = (model: SpecModel, operation: NormalizedOperation): RequestDraft => {
  const media = operation.requestBody?.content[0]
  return {
    parameters: Object.fromEntries(
      operation.parameters.map((parameter) => [
        parameterKey(parameter),
        parameterExample(model, parameter),
      ]),
    ),
    body: media ? bodyExample(model, media) : "",
    mediaType: media?.mediaType,
  }
}

/** Keeps each operation's initial draft stable, so snapshots don't change until the user types. */
export const createInitialDrafts = (model: SpecModel) => {
  const drafts = new Map<string, RequestDraft>()
  const get = (operation: NormalizedOperation) => {
    const existing = drafts.get(operation.id)
    if (existing) return existing
    const draft = initialDraft(model, operation)
    drafts.set(operation.id, draft)
    return draft
  }
  return { get, forget: (id: string) => drafts.delete(id) }
}

export const parseDraftParameters = (
  model: SpecModel,
  operation: NormalizedOperation,
  texts: Record<string, string>,
) =>
  Object.fromEntries(
    operation.parameters.map((parameter) => {
      const key = parameterKey(parameter)
      return [key, parseParameterInput(model, parameter, texts[key] ?? "")]
    }),
  )

export const withParameter = (draft: RequestDraft, key: string, value: string): RequestDraft => ({
  ...draft,
  parameters: { ...draft.parameters, [key]: value },
})

export const withBody = (draft: RequestDraft, body: string): RequestDraft => ({ ...draft, body })

/** Switches the request content type and refills the body with its example. */
export const withMediaType = (
  model: SpecModel,
  operation: NormalizedOperation,
  draft: RequestDraft,
  mediaType: string,
): RequestDraft => {
  const media = operation.requestBody?.content.find(
    (candidate) => candidate.mediaType === mediaType,
  )
  return { ...draft, mediaType, body: media ? bodyExample(model, media) : draft.body }
}
