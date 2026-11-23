import { type SpecModel, findOperation } from "@spectile/core"
import { isSearchShortcut, operationHash, parseOperationHash } from "@spectile/headless"
import { useNavigation, useSpectile } from "@spectile/react"
import { useCallback, useEffect, useLayoutEffect } from "react"

/** The operation `#operationId` in the page URL names, if any. Browser only. */
const hashOperationId = (model: SpecModel) =>
  findOperation(model, parseOperationHash(window.location.hash))?.id

/** Writes `#operationId` without adding a history entry. Only called on user choice, never on load. */
export const writeOperationHash = (id: string) =>
  window.history.replaceState(window.history.state, "", operationHash(id))

/** A plain click on a link to the hash the page already has, which fires no `hashchange`. */
const isSameHashClick = (event: MouseEvent) => {
  if (event.defaultPrevented || event.button !== 0) return false
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false
  const link = event.target instanceof Element ? event.target.closest("a") : null
  return !!link?.getAttribute("href")?.startsWith("#") && link.hash === window.location.hash
}

/**
 * Opens the operation the hash names: once after mounting, so the first render is the same on the
 * server and in the browser, then whenever someone follows a deep link on the page, including a
 * second time.
 */
export const useHashNavigation = (onNavigate?: (id: string) => void) => {
  const { model } = useSpectile()
  const { setActive } = useNavigation()
  const onHashChange = useCallback(() => {
    const id = hashOperationId(model)
    if (!id) return
    setActive(id)
    onNavigate?.(id)
  }, [model, setActive, onNavigate])
  useLayoutEffect(onHashChange, [onHashChange])
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (isSameHashClick(event)) onHashChange()
    }
    window.addEventListener("hashchange", onHashChange)
    document.addEventListener("click", onClick)
    return () => {
      window.removeEventListener("hashchange", onHashChange)
      document.removeEventListener("click", onClick)
    }
  }, [onHashChange])
}

/** `/`, unless typed into a field, runs `onShortcut`; pass a stable function. */
export const useSearchShortcut = (enabled: boolean, onShortcut: () => void) =>
  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isSearchShortcut(event)) return
      event.preventDefault()
      onShortcut()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [enabled, onShortcut])
