import { findOperation } from "@spectile/core"
import { isSearchShortcut, operationHash, parseOperationHash } from "@spectile/headless"
import { useNavigation, useSpectile } from "@spectile/react"
import { type RefObject, useEffect } from "react"

/** Writes `#operationId` without adding a history entry. Only called on user choice, never on load. */
export const writeOperationHash = (id: string) =>
  window.history.replaceState(window.history.state, "", operationHash(id))

/** Opens the operation a changed hash names, e.g. when someone follows a deep link on the page. */
export const useHashNavigation = (onNavigate?: (id: string) => void) => {
  const { model } = useSpectile()
  const { setActive } = useNavigation()
  useEffect(() => {
    const onHashChange = () => {
      const id = findOperation(model, parseOperationHash(window.location.hash))?.id
      if (!id) return
      setActive(id)
      onNavigate?.(id)
    }
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
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
