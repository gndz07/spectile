import type { ExternalDocs } from "@spectile/core"
import { createRequiredContext } from "../../context"

export const [ExternalDocsProvider, useExternalDocs] =
  createRequiredContext<ExternalDocs>("ExternalDocs.Root")
