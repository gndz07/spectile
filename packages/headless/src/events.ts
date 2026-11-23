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

const tagOf = (element: unknown) => (element as { tagName?: string } | undefined)?.tagName

/** The browser already clicks a button on Enter and Space, and a link on Enter. */
const clicksNatively = (element: unknown, key: string) => {
  const tag = tagOf(element)
  return tag === "BUTTON" || (tag === "A" && key === "Enter")
}

/** Enter or Space on an element that the browser won't click for it, such as `<li role="treeitem">`. */
export const clicksOnKey = ({ key, currentTarget }: KeyboardEventLike) =>
  (key === "Enter" || key === " ") && !clicksNatively(currentTarget, key)

/** Clicks the element, so every click handler on it runs; without one, e.g. outside a DOM, runs `fallback`. */
export const clickOr = (element: unknown, fallback: () => void) => {
  const target = element as { click?: () => void } | undefined
  if (typeof target?.click === "function") target.click()
  else fallback()
}

/** `/` pressed outside a text field, with no modifier. */
export const isSearchShortcut = ({ key, ctrlKey, metaKey, altKey, target }: ShortcutEventLike) =>
  key === "/" && !ctrlKey && !metaKey && !altKey && closest(target, EDITABLE) === null
