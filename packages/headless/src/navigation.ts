import type { NormalizedOperation, SpecModel, Tag } from "@spectile/core"
import type { InputEventLike } from "./events"
import { createStore, memoizeLast, select } from "./store"

export type OperationGroup = { tag?: Tag; operations: NormalizedOperation[] }

export type NavigationSource = Pick<SpecModel, "operations" | "tags">

export type NavigationOptions = { query?: string; activeId?: string }

export type NavigationSnapshot = {
  query: string
  activeId?: string
  active?: NormalizedOperation
  groups: OperationGroup[]
  resultCount: number
}

const searchText = ({ method, path, operationId, summary, tags }: NormalizedOperation) =>
  [method, path, operationId, summary, ...tags].filter(Boolean).join(" ").toLowerCase()

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
      tag,
      operations: operations.filter((operation) => operation.tags.includes(tag.name)),
    })),
    { operations: operations.filter((operation) => operation.tags.length === 0) },
  ].filter((group) => group.operations.length > 0)

export const createNavigation = (
  source: NavigationSource,
  { query = "", activeId }: NavigationOptions = {},
) => {
  const store = createStore<{ query: string; activeId?: string }>({ query, activeId })
  const resultsFor = memoizeLast((query: string) => {
    const operations = filterOperations(source.operations, query)
    return { groups: groupByTag(source.tags, operations), resultCount: operations.length }
  })
  const view = select(store, (state): NavigationSnapshot => ({
    ...state,
    active: source.operations.find((operation) => operation.id === state.activeId),
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
