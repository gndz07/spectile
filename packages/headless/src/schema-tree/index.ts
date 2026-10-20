import { type SchemaNode, type SchemaRef, type SpecModel, getSchema } from "@spectile/core"
import { type KeyboardEventLike, type TargetEventLike, fromNestedControl } from "../events"
import { createStore, memoizeLast, select } from "../store"
import type { GetNode } from "./children"
import { type TreeAction, treeKeyAction } from "./keyboard"
import { type SchemaRow, buildRows, expandedToDepth } from "./rows"
import { type TreeState, collapsedAll, withExpanded } from "./state"

export { type SchemaChild, type SchemaRowKind, schemaChildren } from "./children"
export { type TreeAction, type TreeRow, treeKeyAction } from "./keyboard"
export { schemaRowLabel, schemaTypeLabel } from "./labels"
export type { SchemaRow } from "./rows"

export type SchemaTreeOptions = { defaultExpandedDepth?: number }

export type SchemaTreeSnapshot = {
  root: SchemaNode
  rows: SchemaRow[]
  focusedId?: string
  tabStopId?: string
}

export const createSchemaTree = (
  model: SpecModel,
  rootRef: SchemaRef,
  { defaultExpandedDepth = 0 }: SchemaTreeOptions = {},
) => {
  const nodes = new WeakMap<SchemaRef, SchemaNode>()
  const getNode: GetNode = (ref) => {
    const cached = nodes.get(ref)
    if (cached) return cached
    const node = getSchema(model, ref)
    nodes.set(ref, node)
    return node
  }

  const root = getNode(rootRef)
  const store = createStore<TreeState>({
    expanded: expandedToDepth(getNode, root, defaultExpandedDepth),
  })
  const rowsFor = memoizeLast((expanded: ReadonlySet<string>) => buildRows(getNode, root, expanded))
  const view = select(store, ({ expanded, focusedId }): SchemaTreeSnapshot => {
    const rows = rowsFor(expanded)
    const focusVisible = rows.some((row) => row.id === focusedId)
    return { root, rows, focusedId, tabStopId: focusVisible ? focusedId : rows[0]?.id }
  })

  const focus = (id: string) => store.setState({ focusedId: id })

  const setExpanded = (id: string, open: boolean) =>
    store.setState((state) => withExpanded(state, id, open))

  const expand = (id: string) => setExpanded(id, true)
  const collapse = (id: string) => setExpanded(id, false)
  const toggle = (id: string) => setExpanded(id, !store.getSnapshot().expanded.has(id))

  const expandAll = () => store.setState({ expanded: expandedToDepth(getNode, root, Infinity) })

  const collapseAll = () => store.setState((state) => collapsedAll(state, view.getSnapshot().rows))

  const actions: Record<TreeAction["type"], (id: string) => void> = {
    focus,
    expand,
    collapse,
    toggle,
  }

  const getTreeProps = () => ({ role: "tree" as const })

  const getRowProps = (row: SchemaRow) => ({
    role: "treeitem" as const,
    "aria-level": row.depth + 1,
    "aria-setsize": row.setSize,
    "aria-posinset": row.position,
    "aria-expanded": row.expandable ? row.expanded : undefined,
    tabIndex: row.id === view.getSnapshot().tabStopId ? 0 : -1,
    "data-state": row.expandable ? (row.expanded ? "open" : "closed") : undefined,
    "data-depth": row.depth,
    "data-kind": row.kind,
    "data-required": row.required ? "" : undefined,
    "data-recursive": row.recursive ? "" : undefined,
    "data-deprecated": row.node.deprecated ? "" : undefined,
    onKeyDown: (event: KeyboardEventLike) => {
      if (fromNestedControl(event)) return
      const action = treeKeyAction(view.getSnapshot().rows, row.id, event.key)
      if (!action) return
      event.preventDefault()
      actions[action.type](action.id)
    },
    onClick: (event?: TargetEventLike) => {
      if (fromNestedControl(event)) return
      focus(row.id)
      if (row.expandable) toggle(row.id)
    },
    onFocus: (event?: TargetEventLike) => {
      if (!fromNestedControl(event)) focus(row.id)
    },
  })

  return {
    getSnapshot: view.getSnapshot,
    subscribe: view.subscribe,
    focus,
    expand,
    collapse,
    toggle,
    expandAll,
    collapseAll,
    getTreeProps,
    getRowProps,
  }
}

export type SchemaTree = ReturnType<typeof createSchemaTree>
