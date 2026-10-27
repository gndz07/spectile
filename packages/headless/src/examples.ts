import type { NormalizedOperation, Response } from "@spectile/core"

const isSuccess = ({ status }: Response) => /^2(\d\d|XX)$/i.test(status)

const hasBody = ({ content }: Response) => content.length > 0

/** The response an example panel opens on: the first 2xx with a body, else the first with a body, else the first. */
export const defaultExampleResponse = ({ responses }: NormalizedOperation) =>
  responses.find((response) => isSuccess(response) && hasBody(response)) ??
  responses.find(hasBody) ??
  responses[0]
