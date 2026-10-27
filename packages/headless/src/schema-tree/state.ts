import { withEntry } from "../store"
import { type SchemaRow, isWithin } from "./rows"

export type TreeState = {
  expanded: ReadonlySet<string>
  /** The selected variant by row id; 0 when missing. */
  variants: Readonly<Record<string, number>>
  focusedId?: string
}

export const withExpanded = (state: TreeState, id: string, open: boolean): TreeState => {
  if (state.expanded.has(id) === open) return state
  const expanded = new Set(state.expanded)
  if (open) expanded.add(id)
  else expanded.delete(id)
  return { ...state, expanded }
}

export const withVariant = (state: TreeState, id: string, index: number): TreeState => {
  const variants = withEntry(state.variants, id, index)
  return variants === state.variants ? state : { ...state, variants }
}

/** When the focused row gets hidden, focus moves to the closest row still shown that held it. */
export const withFocusShown = (state: TreeState, rows: readonly SchemaRow[]): TreeState => {
  const { focusedId } = state
  if (focusedId === undefined || rows.some((row) => row.id === focusedId)) return state
  const holder = rows.findLast((row) => isWithin(focusedId, row.id))
  return { ...state, focusedId: holder?.id }
}
