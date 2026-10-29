import type { RenderMarkdown } from "@spectile/react"
import ReactMarkdown from "react-markdown"

/** Raw HTML is skipped and unsafe link protocols are dropped (react-markdown's defaults). */
export const defaultRenderMarkdown: RenderMarkdown = (markdown) => (
  <ReactMarkdown>{markdown}</ReactMarkdown>
)
