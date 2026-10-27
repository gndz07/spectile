import type { RequestBody } from "@spectile/core"
import { createRequiredContext } from "../../context"
import { useTryIt } from "../../hooks"
import { useOperationContext } from "../operation/context"

export const [RequestBodyProvider, useRequestBody] =
  createRequiredContext<RequestBody>("RequestBody.Root")

/** The content type chosen with `RequestBody.MediaSelect`; shared with the operation's try-it form. */
export const useRequestBodyMedia = () => {
  const { content } = useRequestBody()
  const { draft } = useTryIt(useOperationContext().id)
  return content.find((media) => media.mediaType === draft.mediaType) ?? content[0]
}
