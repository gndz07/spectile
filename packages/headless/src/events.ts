import type { FileLike } from "@spectile/core"

export type EventLike = { preventDefault: () => void }

/** Optional, so handlers can also be called without a DOM event. */
export type TargetEventLike = { target?: unknown; currentTarget?: unknown }

export type KeyboardEventLike = EventLike & TargetEventLike & { key: string }

export type InputEventLike = { currentTarget: { value: string } }

export type FileInputEventLike = { currentTarget: { files: ArrayLike<FileLike> | null } }

export type ShortcutEventLike = TargetEventLike & {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
}

const CONTROLS = "a[href], button, input, select, textarea, summary, [tabindex], [contenteditable]"

const EDITABLE = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'

const closest = (target: unknown, selector: string) =>
  (target as { closest?: (selector: string) => unknown } | undefined)?.closest?.(selector) ?? null

/** The event comes from a link, button or other control inside the element, not from the element itself. */
export const fromNestedControl = ({ target, currentTarget }: TargetEventLike = {}) => {
  const control = closest(target, CONTROLS)
  return control !== null && control !== currentTarget
}

/** `/` pressed outside a text field, with no modifier. */
export const isSearchShortcut = ({ key, ctrlKey, metaKey, altKey, target }: ShortcutEventLike) =>
  key === "/" && !ctrlKey && !metaKey && !altKey && closest(target, EDITABLE) === null
