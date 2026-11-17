import { type SchemaNode, type SchemaRef, type SpecModel, getMergedSchema } from "@spectile/core"
import {
  type InputEventLike,
  type KeyboardEventLike,
  type TargetEventLike,
  fromNestedControl,
} from "../events"
import { createStore, memoizeLast, select } from "../store"
import {
  type GetNode,
  type SchemaUsage,
  type SelectedVariant,
  hiddenIn,
  hiddenPropertyNames,
} from "./children"
import { type TreeAction, treeKeyAction } from "./keyboard"
import {
  type RecursionMode,
  ROOT_ID,
  type SchemaRow,
  buildRows,
  expandedToDepth,
  hasRootRow,
} from "./rows"
import { type TreeState, withExpanded, withFocusShown, withVariant } from "./state"

export {
  type SchemaChild,
  type SchemaRowKind,
  type SchemaUsage,
  type VariantKind,
  schemaChildren,
  variantsOf,
} from "./children"
export { type TreeAction, type TreeRow, treeKeyAction } from "./keyboard"
export {
  type AllowedValues,
  schemaAllowedValues,
  schemaConstraintsLabel,
  schemaDefaultLabel,
  schemaRowLabel,
  schemaTypeLabel,
} from "./labels"
export type { RecursionMode, SchemaRow, SchemaRowVariants } from "./rows"
export { variantLabel } from "./variants"

export type SchemaTreeOptions = {
  defaultExpandedDepth?: number
  /** `request` leaves out readOnly properties, `response` leaves out writeOnly ones. */
  usage?: SchemaUsage
  /** Defaults to `expandOnce`. */
  recursion?: RecursionMode
}

export type SchemaTreeSnapshot = {
  root: SchemaNode
  rows: SchemaRow[]
  focusedId?: string
  tabStopId?: string
  /** Every row that can open is open, so an Expand all control shows Collapse all. */
  allExpanded: boolean
  /** The names of the properties `usage` left out, at any depth. */
  hiddenNames: string[]
}

export const createSchemaTree = (
  model: SpecModel,
  rootRef: SchemaRef,
  { defaultExpandedDepth = 0, usage, recursion = "expandOnce" }: SchemaTreeOptions = {},
) => {
  const nodes = new WeakMap<SchemaRef, SchemaNode>()
  const getNode: GetNode = (ref) => {
    const cached = nodes.get(ref)
    if (cached) return cached
    const node = getMergedSchema(model, ref)
    nodes.set(ref, node)
    return node
  }

  const root = getNode(rootRef)
  const hidden = hiddenIn(usage)
  const hiddenNames = hiddenPropertyNames(getNode, root, hidden)
  const collapsed: ReadonlySet<string> = new Set(hasRootRow(root) ? [ROOT_ID] : [])
  const shapeOf = (variants: TreeState["variants"]) => {
    const selected: SelectedVariant = (id) => variants[id] ?? 0
    return { getNode, root, selected, hidden, recursion }
  }

  const expandedTo = (depth: number, variants: TreeState["variants"]) =>
    new Set([...collapsed, ...expandedToDepth(shapeOf(variants), depth)])

  const store = createStore<TreeState>({
    expanded: expandedTo(defaultExpandedDepth, {}),
    variants: {},
  })
  const rowsFor = memoizeLast((expanded: ReadonlySet<string>, variants: TreeState["variants"]) =>
    buildRows(shapeOf(variants), expanded),
  )
  const view = select(store, ({ expanded, variants, focusedId }): SchemaTreeSnapshot => {
    const rows = rowsFor(expanded, variants)
    const focusVisible = rows.some((row) => row.id === focusedId)
    return {
      root,
      rows,
      focusedId,
      tabStopId: focusVisible ? focusedId : rows[0]?.id,
      allExpanded: !rows.some((row) => row.expandable && !row.expanded && !row.recursive),
      hiddenNames,
    }
  })

  const update = (change: (state: TreeState) => TreeState) =>
    store.setState((state) => {
      const next = change(state)
      return next === state ? state : withFocusShown(next, rowsFor(next.expanded, next.variants))
    })

  const focus = (id: string) => store.setState({ focusedId: id })

  const setExpanded = (id: string, open: boolean) =>
    update((state) => withExpanded(state, id, open))

  const expand = (id: string) => setExpanded(id, true)
  const collapse = (id: string) => setExpanded(id, false)
  const toggle = (id: string) => setExpanded(id, !store.getSnapshot().expanded.has(id))

  const expandAll = () =>
    update((state) => ({ ...state, expanded: expandedTo(Infinity, state.variants) }))

  const collapseAll = () => update((state) => ({ ...state, expanded: collapsed }))

  const selectVariant = (id: string, index: number) =>
    update((state) => withVariant(state, id, index))

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

  /** Options come from `row.variants.labels`, valued by index. */
  const getVariantSelectProps = (row: SchemaRow) => ({
    value: String(row.variants?.selected ?? 0),
    onChange: (event: InputEventLike) => selectVariant(row.id, Number(event.currentTarget.value)),
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
    selectVariant,
    getTreeProps,
    getRowProps,
    getVariantSelectProps,
  }
}

export type SchemaTree = ReturnType<typeof createSchemaTree>
