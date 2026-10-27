import { useEffect, useRef } from "react"

/**
 * Moves DOM focus to the tree item the store says is focused, unless focus is already on it (or
 * on a control inside it) or outside the tree.
 */
export const useFollowFocus = <T extends HTMLElement>(focused: boolean) => {
  const ref = useRef<T>(null)
  useEffect(() => {
    const element = ref.current
    if (!focused || !element) return
    const { activeElement, body } = element.ownerDocument
    const onItem = activeElement?.closest('[role="treeitem"]') === element
    if (activeElement && element.contains(activeElement) && onItem) return
    const focusInTree =
      !activeElement ||
      activeElement === body ||
      element.closest('[role="tree"]')?.contains(activeElement)
    if (focusInTree) element.focus()
  }, [focused])
  return ref
}
