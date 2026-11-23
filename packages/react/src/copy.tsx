import { useEffect, useState } from "react"
import { Primitive, type PrimitiveProps, mergeProps } from "./primitive"

export type CopyProps = PrimitiveProps<"button"> & {
  text: string
  /** How long `data-state="copied"` stays on, in milliseconds. */
  resetAfter?: number
}

/** Async, so a page without the Clipboard API (plain http) rejects instead of throwing. */
const writeToClipboard = async (text: string) => navigator.clipboard.writeText(text)

/** Copies `text` to the clipboard. `data-state` is `copied` for a moment after, or `failed`. */
export const Copy = ({ text, resetAfter = 2000, ...props }: CopyProps) => {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle")
  useEffect(() => {
    if (state === "idle") return
    const timer = setTimeout(() => setState("idle"), resetAfter)
    return () => clearTimeout(timer)
  }, [state, resetAfter])
  const copy = () =>
    writeToClipboard(text).then(
      () => setState("copied"),
      () => setState("failed"),
    )
  const ours = { type: "button" as const, "data-state": state, onClick: () => void copy() }
  return <Primitive as="button" {...mergeProps(ours, props)} />
}
