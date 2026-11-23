import { sameArguments } from "@spectile/headless"
import { useState } from "react"

/**
 * Creates the value on mount and again only when `key` changes, reading everything else once.
 * Stores live here, so they keep their state across renders that pass new but equal options.
 */
export const useRecreatedOn = <T>(key: readonly unknown[], create: () => T): T => {
  const [entry, setEntry] = useState(() => ({ key, value: create() }))
  if (sameArguments(entry.key, key)) return entry.value
  const next = { key, value: create() }
  setEntry(next)
  return next.value
}
