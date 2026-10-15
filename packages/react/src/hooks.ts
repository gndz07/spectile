import type { SchemaRef } from "@spectile/core"
import {
  type ReadableStore,
  type SchemaTree,
  type SchemaTreeOptions,
  type SchemaTreeSnapshot,
  createSchemaTree,
} from "@spectile/headless"
import { useMemo, useSyncExternalStore } from "react"
import { useSpectile } from "./provider"

export type SchemaTreeState = SchemaTree & SchemaTreeSnapshot

export const useStore = <T>(store: ReadableStore<T>) =>
  useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)

export const useNavigation = () => {
  const { navigation } = useSpectile()
  return { ...navigation, ...useStore(navigation) }
}

/** The operation with this id, or the active one when no id is given. */
export const useOperation = (id?: string) => {
  const { model } = useSpectile()
  const { active } = useNavigation()
  return id === undefined ? active : model.operations.find((operation) => operation.id === id)
}

/** The credentials shared by every operation. */
export const useTryItSettings = () => {
  const { tryIt } = useSpectile()
  return { ...tryIt, ...useStore(tryIt) }
}

export const useTryIt = (operationId: string) => {
  const session = useSpectile().tryIt.forOperation(operationId)
  return { ...session, ...useStore(session) }
}

export type TryItState = ReturnType<typeof useTryIt>

export const useSchemaTree = (
  schema: SchemaRef,
  { defaultExpandedDepth }: SchemaTreeOptions = {},
): SchemaTreeState => {
  const { model } = useSpectile()
  const tree = useMemo(
    () => createSchemaTree(model, schema, { defaultExpandedDepth }),
    [model, schema.pointer, defaultExpandedDepth],
  )
  return { ...tree, ...useStore(tree) }
}
