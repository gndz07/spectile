import { useEffect, useState } from "react"
import { Primitive, type PrimitiveProps, mergeProps } from "./primitive"

export type CopyProps = PrimitiveProps<"button"> & {
  text: string
  /** How long `data-state="copied"` stays on, in milliseconds. */
  resetAfter?: number
}

/** Copies `text` to the clipboard. `data-state` is `copied` for a moment after, or `failed`. */
export const Copy = ({ text, resetAfter = 2000, ...props }: CopyProps) => {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle")
  useEffect(() => {
    if (state === "idle") return
    const timer = setTimeout(() => setState("idle"), resetAfter)
    return () => clearTimeout(timer)
  }, [state, resetAfter])
  const copy = () =>
    navigator.clipboard.writeText(text).then(
      () => setState("copied"),
      () => setState("failed"),
    )
  const ours = { type: "button" as const, "data-state": state, onClick: () => void copy() }
  return <Primitive as="button" {...mergeProps(ours, props)} />
}
