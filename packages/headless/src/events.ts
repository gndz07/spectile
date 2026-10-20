import type { FileLike } from "@spectile/core"

export type EventLike = { preventDefault: () => void }

/** Optional, so handlers can also be called without a DOM event. */
export type TargetEventLike = { target?: unknown; currentTarget?: unknown }

export type KeyboardEventLike = EventLike & TargetEventLike & { key: string }

export type InputEventLike = { currentTarget: { value: string } }

export type FileInputEventLike = { currentTarget: { files: ArrayLike<FileLike> | null } }

const CONTROLS = "a[href], button, input, select, textarea, summary, [tabindex], [contenteditable]"

/** The event comes from a link, button or other control inside the element, not from the element itself. */
export const fromNestedControl = ({ target, currentTarget }: TargetEventLike = {}) => {
  const control = (target as { closest?: (selector: string) => unknown } | undefined)?.closest?.(
    CONTROLS,
  )
  return control != null && control !== currentTarget
}
