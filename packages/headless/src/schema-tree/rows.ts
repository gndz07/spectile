import type { SchemaNode } from "@spectile/core"
import {
  type ChildEntry,
  type GetNode,
  type SchemaChild,
  type SelectedVariant,
  type VariantKind,
  childEntries,
  variantsOf,
} from "./children"
import { labelVariant } from "./variants"

export type SchemaRowVariants = { kind: VariantKind; labels: string[]; selected: number }

export type SchemaRow = Omit<SchemaChild, "segments" | "schema"> & {
  id: string
  parentId?: string
  depth: number
  node: SchemaNode
  expandable: boolean
  expanded: boolean
  recursive: boolean
  /** On a recursive row, the id of the ancestor row with the same schema; `#` is the root. */
  recursiveTarget?: string
  /** For a oneOf/anyOf schema, the options of its variant select. */
  variants?: SchemaRowVariants
  setSize: number
  position: number
}

type WalkEntry = ChildEntry &
  Pick<SchemaRow, "parentId" | "depth" | "recursiveTarget" | "setSize" | "position"> & {
    /** Inside a recursive row, recursive rows stop expanding and only link back. */
    withinRecursive: boolean
    hasChildren: boolean
  }

export const ROOT_ID = "#"

/** A oneOf/anyOf root gets a row of its own to hold the variant select. */
export const hasRootRow = (root: SchemaNode) => variantsOf(root) !== undefined

/** Depth-first over the tree; `visit` decides what each entry yields and whether to `descend`. */
const walk = <T>(
  getNode: GetNode,
  root: SchemaNode,
  selected: SelectedVariant,
  visit: (entry: WalkEntry, descend: () => T[]) => T[],
): T[] => {
  const children = (entry: Pick<ChildEntry, "node" | "id">) =>
    childEntries(getNode, entry.node, entry.id, selected)
  const step = (
    entries: ChildEntry[],
    parentId: string | undefined,
    depth: number,
    ancestors: ReadonlyMap<string, string>,
    withinRecursive: boolean,
  ): T[] =>
    entries.flatMap((entry, index) => {
      const recursiveTarget = ancestors.get(entry.node.pointer)
      const inner = new Map(ancestors).set(entry.node.pointer, entry.id)
      const nested = children(entry)
      return visit(
        {
          ...entry,
          parentId,
          depth,
          recursiveTarget,
          withinRecursive,
          hasChildren: nested.length > 0,
          setSize: entries.length,
          position: index + 1,
        },
        () => step(nested, entry.id, depth + 1, inner, withinRecursive || !!recursiveTarget),
      )
    })
  const rootEntry: ChildEntry = {
    child: { segments: [], kind: "root", required: false, schema: root },
    id: ROOT_ID,
    node: root,
  }
  return hasRootRow(root)
    ? step([rootEntry], undefined, 0, new Map(), false)
    : step(children(rootEntry), undefined, 0, new Map([[root.pointer, ROOT_ID]]), false)
}

const isExpandable = ({ hasChildren, recursiveTarget, withinRecursive }: WalkEntry) =>
  hasChildren && !(recursiveTarget && withinRecursive)

export const buildRows = (
  getNode: GetNode,
  root: SchemaNode,
  expanded: ReadonlySet<string>,
  selected: SelectedVariant,
): SchemaRow[] =>
  walk<SchemaRow>(getNode, root, selected, (entry, descend) => {
    const { child, id, node, parentId, depth, recursiveTarget, setSize, position } = entry
    const { segments, schema, ...fields } = child
    const expandable = isExpandable(entry)
    const variants = variantsOf(node)
    const row: SchemaRow = {
      ...fields,
      id,
      parentId,
      depth,
      node,
      expandable,
      expanded: expandable && expanded.has(id),
      recursive: recursiveTarget !== undefined,
      recursiveTarget,
      variants: variants && {
        kind: variants.kind,
        labels: variants.options.map((_, index) => labelVariant(getNode, node, index)),
        selected: selected(id),
      },
      setSize,
      position,
    }
    return row.expanded ? [row, ...descend()] : [row]
  })

/** A root row counts as depth -1, so the depth means the same with or without one. */
export const expandedToDepth = (
  getNode: GetNode,
  root: SchemaNode,
  maxDepth: number,
  selected: SelectedVariant,
) => {
  const offset = hasRootRow(root) ? 1 : 0
  return new Set(
    walk<string>(getNode, root, selected, (entry, descend) =>
      entry.depth >= maxDepth + offset || entry.recursiveTarget || !isExpandable(entry)
        ? []
        : [entry.id, ...descend()],
    ),
  )
}

export const isWithin = (id: string, ancestorId: string) => id.startsWith(`${ancestorId}/`)
