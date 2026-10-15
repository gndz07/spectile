import type { RequestBody } from "@spectile/core"
import { createRequiredContext } from "../../context"

export const [RequestBodyProvider, useRequestBody] =
  createRequiredContext<RequestBody>("RequestBody.Root")
