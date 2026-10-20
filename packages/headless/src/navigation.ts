import {
  type NormalizedOperation,
  type OperationKind,
  type SpecModel,
  type Tag,
  findOperation,
} from "@spectile/core"
import type { InputEventLike } from "./events"
import { createStore, memoizeLast, select } from "./store"

/** Webhooks form one group without a tag. */
export type OperationGroup = { kind: OperationKind; tag?: Tag; operations: NormalizedOperation[] }

export type NavigationSource = Pick<SpecModel, "operations" | "webhooks" | "tags">

export type NavigationOptions = { query?: string; activeId?: string }

export type NavigationSnapshot = {
  query: string
  activeId?: string
  active?: NormalizedOperation
  groups: OperationGroup[]
  resultCount: number
}

const searchText = ({ kind, method, path, operationId, summary, tags }: NormalizedOperation) =>
  [kind === "webhook" && kind, method, path, operationId, summary, ...tags]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

export const filterOperations = (operations: NormalizedOperation[], query: string) => {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
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

export const createNavigation = (
  source: NavigationSource,
  { query = "", activeId }: NavigationOptions = {},
) => {
  const store = createStore<{ query: string; activeId?: string }>({ query, activeId })
  const resultsFor = memoizeLast((query: string) => {
    const operations = filterOperations(source.operations, query)
    const webhooks = filterOperations(source.webhooks, query)
    return {
      groups: navigationGroups(source.tags, operations, webhooks),
      resultCount: operations.length + webhooks.length,
    }
  })
  const view = select(store, (state): NavigationSnapshot => ({
    ...state,
    active: findOperation(source, state.activeId),
    ...resultsFor(state.query),
  }))

  const setQuery = (query: string) => store.setState({ query })
  const setActive = (activeId: string | undefined) => store.setState({ activeId })

  const getSearchProps = () => ({
    type: "search" as const,
    value: store.getSnapshot().query,
    onChange: (event: InputEventLike) => setQuery(event.currentTarget.value),
  })

  const getItemProps = (operation: NormalizedOperation) => {
    const active = operation.id === store.getSnapshot().activeId
    return {
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
    getSearchProps,
    getItemProps,
  }
}

export type Navigation = ReturnType<typeof createNavigation>
