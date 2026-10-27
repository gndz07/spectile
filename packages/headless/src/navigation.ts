import {
  type NormalizedOperation,
  type OperationKind,
  type SpecModel,
  type Tag,
  findOperation,
} from "@spectile/core"
import {
  type InputEventLike,
  type KeyboardEventLike,
  type TargetEventLike,
  fromNestedControl,
} from "./events"
import { type TreeAction, type TreeRow, treeKeyAction } from "./schema-tree"
import { searchTerms } from "./search"
import { createStore, memoizeLast, select } from "./store"

/** Webhooks form one group without a tag. */
export type OperationGroup = { kind: OperationKind; tag?: Tag; operations: NormalizedOperation[] }

export type NavigationSource = Pick<SpecModel, "operations" | "webhooks" | "tags">

export type NavigationOptions = { query?: string; activeId?: string }

/** A group, or an operation within a group (one operation can be in several). */
export type NavigationRow = TreeRow & { group: OperationGroup; operation?: NormalizedOperation }

export type NavigationSnapshot = {
  query: string
  activeId?: string
  active?: NormalizedOperation
  groups: OperationGroup[]
  resultCount: number
  /** The visible groups and operations, in order. */
  rows: NavigationRow[]
  focusedId?: string
  tabStopId?: string
}

type NavigationState = {
  query: string
  activeId?: string
  collapsed: ReadonlySet<string>
  focusedId?: string
}

const searchText = ({ kind, method, path, operationId, summary, tags }: NormalizedOperation) =>
  [kind === "webhook" && kind, method, path, operationId, summary, ...tags]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

export const filterOperations = (operations: NormalizedOperation[], query: string) => {
  const terms = searchTerms(query)
  if (terms.length === 0) return operations
  return operations.filter((operation) => {
    const text = searchText(operation)
    return terms.every((term) => text.includes(term))
  })
}

export const groupByTag = (tags: Tag[], operations: NormalizedOperation[]): OperationGroup[] =>
  [
    ...tags.map((tag) => ({
      kind: "operation" as const,
      tag,
      operations: operations.filter((operation) => operation.tags.includes(tag.name)),
    })),
    {
      kind: "operation" as const,
      operations: operations.filter((operation) => operation.tags.length === 0),
    },
  ].filter((group) => group.operations.length > 0)

/** Tag groups, then untagged operations, then webhooks. */
export const navigationGroups = (
  tags: Tag[],
  operations: NormalizedOperation[],
  webhooks: NormalizedOperation[],
): OperationGroup[] => [
  ...groupByTag(tags, operations),
  ...(webhooks.length > 0 ? [{ kind: "webhook" as const, operations: webhooks }] : []),
]

export const groupKey = ({ kind, tag }: OperationGroup) => (tag ? `tag:${tag.name}` : kind)

const ITEM_SEPARATOR = "\u001f"

const itemKey = (group: OperationGroup, operation: NormalizedOperation) =>
  `${groupKey(group)}${ITEM_SEPARATOR}${operation.id}`

/** While searching, every group shows its matches, collapsed or not. */
export const navigationRows = (
  groups: OperationGroup[],
  collapsed: ReadonlySet<string>,
  searching: boolean,
): NavigationRow[] =>
  groups.flatMap((group) => {
    const id = groupKey(group)
    const expanded = searching || !collapsed.has(id)
    const items = group.operations.map(
      (operation): NavigationRow => ({
        id: itemKey(group, operation),
        parentId: id,
        expandable: false,
        expanded: false,
        group,
        operation,
      }),
    )
    return [{ id, expandable: true, expanded, group }, ...(expanded ? items : [])]
  })

/** `#` plus the operation's id. */
export const operationHash = (id: string) => `#${encodeURIComponent(id)}`

export const parseOperationHash = (hash: string) => {
  try {
    return decodeURIComponent(hash.replace(/^#/, "")) || undefined
  } catch {
    return undefined
  }
}

export const createNavigation = (
  source: NavigationSource,
  { query = "", activeId }: NavigationOptions = {},
) => {
  const store = createStore<NavigationState>({ query, activeId, collapsed: new Set() })
  const resultsFor = memoizeLast((query: string) => {
    const operations = filterOperations(source.operations, query)
    const webhooks = filterOperations(source.webhooks, query)
    return {
      groups: navigationGroups(source.tags, operations, webhooks),
      resultCount: operations.length + webhooks.length,
    }
  })
  const rowsFor = memoizeLast(
    (groups: OperationGroup[], collapsed: ReadonlySet<string>, query: string) =>
      navigationRows(groups, collapsed, searchTerms(query).length > 0),
  )
  const view = select(store, ({ collapsed, ...state }): NavigationSnapshot => {
    const results = resultsFor(state.query)
    const rows = rowsFor(results.groups, collapsed, state.query)
    const shown = (id?: string) => rows.find((row) => row.id === id)?.id
    const activeRow = rows.find((row) => row.operation?.id === state.activeId)?.id
    return {
      ...state,
      ...results,
      active: findOperation(source, state.activeId),
      rows,
      tabStopId: shown(state.focusedId) ?? activeRow ?? rows[0]?.id,
    }
  })

  const setQuery = (query: string) => store.setState({ query })
  const setActive = (activeId: string | undefined) => store.setState({ activeId })
  const focus = (id: string) => store.setState({ focusedId: id })

  const setExpanded = (id: string, open: boolean) =>
    store.setState((state) => {
      if (state.collapsed.has(id) !== open) return state
      const collapsed = new Set(state.collapsed)
      if (open) collapsed.delete(id)
      else collapsed.add(id)
      const hidesFocus = !open && !!state.focusedId?.startsWith(`${id}${ITEM_SEPARATOR}`)
      return { ...state, collapsed, focusedId: hidesFocus ? id : state.focusedId }
    })

  const toggle = (id: string) => setExpanded(id, store.getSnapshot().collapsed.has(id))

  const actions: Record<TreeAction["type"], (id: string) => void> = {
    focus,
    expand: (id) => setExpanded(id, true),
    collapse: (id) => setExpanded(id, false),
    toggle,
  }

  const getTreeProps = () => ({ role: "tree" as const })

  const getRowProps = (id: string) => ({
    role: "treeitem" as const,
    tabIndex: id === view.getSnapshot().tabStopId ? 0 : -1,
    onKeyDown: (event: KeyboardEventLike) => {
      if (fromNestedControl(event)) return
      const action = treeKeyAction(view.getSnapshot().rows, id, event.key)
      if (!action) return
      event.preventDefault()
      actions[action.type](action.id)
    },
    onFocus: (event?: TargetEventLike) => {
      if (!fromNestedControl(event)) focus(id)
    },
  })

  const getSearchProps = () => ({
    type: "search" as const,
    value: store.getSnapshot().query,
    onChange: (event: InputEventLike) => setQuery(event.currentTarget.value),
  })

  /** For the element holding a group's heading and its operations. */
  const getGroupProps = (group: OperationGroup) => {
    const id = groupKey(group)
    const expanded = view.getSnapshot().rows.find((row) => row.id === id)?.expanded ?? false
    return {
      ...getRowProps(id),
      "aria-expanded": expanded,
      "data-state": expanded ? "open" : "closed",
      "data-kind": group.kind,
    }
  }

  /** For the group's heading: a click opens or closes the group. */
  const getGroupToggleProps = (group: OperationGroup) => ({
    onClick: () => toggle(groupKey(group)),
  })

  /** Pass the group the item is listed in to make it part of the keyboard tree. */
  const getItemProps = (operation: NormalizedOperation, group?: OperationGroup) => {
    const active = operation.id === store.getSnapshot().activeId
    return {
      ...(group && getRowProps(itemKey(group, operation))),
      "aria-current": active ? ("page" as const) : undefined,
      "data-state": active ? "active" : "inactive",
      "data-method": operation.method,
      "data-deprecated": operation.deprecated ? "" : undefined,
      onClick: () => setActive(operation.id),
    }
  }

  return {
    getSnapshot: view.getSnapshot,
    subscribe: view.subscribe,
    setQuery,
    setActive,
    focus,
    toggle,
    getTreeProps,
    getSearchProps,
    getGroupProps,
    getGroupToggleProps,
    getItemProps,
  }
}

export type Navigation = ReturnType<typeof createNavigation>
