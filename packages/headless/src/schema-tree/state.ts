import { type SchemaRow, isWithin } from "./rows"

export type TreeState = { expanded: ReadonlySet<string>; focusedId?: string }

/** Collapsing a row that hides the focused one moves focus to that row. */
export const withExpanded = (state: TreeState, id: string, open: boolean): TreeState => {
  if (state.expanded.has(id) === open) return state
  const expanded = new Set(state.expanded)
  if (open) expanded.add(id)
  else expanded.delete(id)
  const hidesFocus = !open && state.focusedId !== undefined && isWithin(state.focusedId, id)
  return { expanded, focusedId: hidesFocus ? id : state.focusedId }
}

/** Focus moves to the top-level row that contained it. */
export const collapsedAll = ({ focusedId }: TreeState, rows: readonly SchemaRow[]): TreeState => {
  const containsFocus = (row: SchemaRow) =>
    focusedId !== undefined && (row.id === focusedId || isWithin(focusedId, row.id))
  const topLevel = rows.find((row) => row.depth === 0 && containsFocus(row))
  return { expanded: new Set(), focusedId: topLevel?.id ?? focusedId }
}
