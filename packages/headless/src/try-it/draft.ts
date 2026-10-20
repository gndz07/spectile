import {
  type BodyField,
  type FileLike,
  type MediaType,
  type NormalizedOperation,
  type SpecModel,
  bodyExample,
  fieldExamples,
  isEmptyValue,
  parameterExample,
  parameterKey,
  parseParameterInput,
  parseSchemaInput,
} from "@spectile/core"
import type { RequestDraft } from "./types"

export const requestMedia = (operation: NormalizedOperation, mediaType?: string) =>
  operation.requestBody?.content.find((candidate) => candidate.mediaType === mediaType)

const bodyDraft = (model: SpecModel, media?: MediaType) => ({
  body: media ? bodyExample(model, media) : "",
  mediaType: media?.mediaType,
  fields: media ? fieldExamples(model, media) : {},
  files: {},
})

export const initialDraft = (model: SpecModel, operation: NormalizedOperation): RequestDraft => ({
  parameters: Object.fromEntries(
    operation.parameters.map((parameter) => [
      parameterKey(parameter),
      parameterExample(model, parameter),
    ]),
  ),
  ...bodyDraft(model, operation.requestBody?.content[0]),
})

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

/** Typed text converted for each field's schema, plus the chosen files. Empty fields are left out. */
export const parseDraftFields = (
  model: SpecModel,
  fields: BodyField[],
  { fields: texts, files }: RequestDraft,
) =>
  Object.fromEntries(
    fields.flatMap((field) => {
      const chosen = files[field.name] ?? []
      const value = field.file
        ? field.multiple
          ? chosen
          : chosen[0]
        : parseSchemaInput(model, field.schema, texts[field.name] ?? "")
      return isEmptyValue(value) ? [] : [[field.name, value]]
    }),
  )

export const withParameter = (draft: RequestDraft, key: string, value: string): RequestDraft => ({
  ...draft,
  parameters: { ...draft.parameters, [key]: value },
})

export const withBody = (draft: RequestDraft, body: string): RequestDraft => ({ ...draft, body })

export const withField = (draft: RequestDraft, name: string, text: string): RequestDraft => ({
  ...draft,
  fields: { ...draft.fields, [name]: text },
})

export const withFiles = (draft: RequestDraft, name: string, files: FileLike[]): RequestDraft => ({
  ...draft,
  files: { ...draft.files, [name]: files },
})

/** Switches the request content type and refills the body with its example. */
export const withMediaType = (
  model: SpecModel,
  operation: NormalizedOperation,
  draft: RequestDraft,
  mediaType: string,
): RequestDraft => {
  const media = requestMedia(operation, mediaType)
  return media ? { ...draft, ...bodyDraft(model, media) } : { ...draft, mediaType }
}
