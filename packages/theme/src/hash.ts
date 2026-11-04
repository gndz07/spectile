import { type SpecModel, findOperation } from "@spectile/core"
import { isSearchShortcut, operationHash, parseOperationHash } from "@spectile/headless"
import { useNavigation, useSpectile } from "@spectile/react"
import { type RefObject, useEffect } from "react"

/** The operation `#operationId` in the page URL names, if any. */
export const hashOperationId = (model: SpecModel) =>
  typeof window === "undefined"
    ? undefined
    : findOperation(model, parseOperationHash(window.location.hash))?.id

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
 * Opens the operation the hash names when someone follows a deep link on the page, including a
 * second time.
 */
export const useHashNavigation = (onNavigate?: (id: string) => void) => {
  const { model } = useSpectile()
  const { setActive } = useNavigation()
  useEffect(() => {
    const onHashChange = () => {
      const id = hashOperationId(model)
      if (!id) return
      setActive(id)
      onNavigate?.(id)
    }
    const onClick = (event: MouseEvent) => {
      if (isSameHashClick(event)) onHashChange()
    }
    window.addEventListener("hashchange", onHashChange)
    document.addEventListener("click", onClick)
    return () => {
      window.removeEventListener("hashchange", onHashChange)
      document.removeEventListener("click", onClick)
    }
  }, [model, setActive, onNavigate])
}

/** `/` focuses the search field, unless typed into another field. */
export const useSearchShortcut = (enabled: boolean, input: RefObject<HTMLInputElement | null>) =>
  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isSearchShortcut(event) || !input.current) return
      event.preventDefault()
      input.current.focus()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [enabled, input])
