import type { SchemaNode } from "@spectile/core"
import {
  type ChildEntry,
  type GetNode,
  type IsHidden,
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
  /** Its schema is an ancestor's; see `RecursionMode` for whether it still expands. */
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
    /** The depth without array item rows, which stand for their array rather than a level. */
    level: number
    hasChildren: boolean
  }

/**
 * `expandOnce`: a recursive row opens one more level, then rows inside it only link back.
 * `link`: a recursive row never opens; it only links back.
 */
export type RecursionMode = "expandOnce" | "link"

export type TreeShape = {
  getNode: GetNode
  root: SchemaNode
  selected: SelectedVariant
  hidden: IsHidden
  recursion: RecursionMode
}

export const ROOT_ID = "#"

/** A oneOf/anyOf root gets a row of its own to hold the variant select. */
export const hasRootRow = (root: SchemaNode) => variantsOf(root) !== undefined

/** Depth-first over the tree; `visit` decides what each entry yields and whether to `descend`. */
const walk = <T>(
  { getNode, root, selected, hidden, recursion }: TreeShape,
  visit: (entry: WalkEntry, descend: () => T[]) => T[],
): T[] => {
  const children = (entry: Pick<ChildEntry, "node" | "id">) =>
    childEntries(getNode, entry.node, entry.id, selected, hidden)
  const step = (
    entries: ChildEntry[],
    parentId: string | undefined,
    depth: number,
    parentLevel: number,
    ancestors: ReadonlyMap<string, string>,
    withinRecursive: boolean,
  ): T[] =>
    entries.flatMap((entry, index) => {
      const recursiveTarget = ancestors.get(entry.node.pointer)
      const inner = new Map(ancestors).set(entry.node.pointer, entry.id)
      const stops = recursiveTarget !== undefined && (recursion === "link" || withinRecursive)
      const nested = stops ? [] : children(entry)
      const level = entry.child.kind === "items" ? parentLevel : parentLevel + 1
      const nextWithin = withinRecursive || recursiveTarget !== undefined
      return visit(
        {
          ...entry,
          parentId,
          depth,
          level,
          recursiveTarget,
          hasChildren: nested.length > 0,
          setSize: entries.length,
          position: index + 1,
        },
        () => step(nested, entry.id, depth + 1, level, inner, nextWithin),
      )
    })
  const rootEntry: ChildEntry = {
    child: { segments: [], kind: "root", required: false, schema: root },
    id: ROOT_ID,
    node: root,
  }
  return hasRootRow(root)
    ? step([rootEntry], undefined, 0, -1, new Map(), false)
    : step(children(rootEntry), undefined, 0, -1, new Map([[root.pointer, ROOT_ID]]), false)
}

export const buildRows = (shape: TreeShape, expanded: ReadonlySet<string>): SchemaRow[] =>
  walk<SchemaRow>(shape, (entry, descend) => {
    const { child, id, node, parentId, depth, recursiveTarget, setSize, position } = entry
    const { segments, schema, ...fields } = child
    const expandable = entry.hasChildren
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
        labels: variants.options.map((_, index) => labelVariant(shape.getNode, node, index)),
        selected: shape.selected(id),
      },
      setSize,
      position,
    }
    return row.expanded ? [row, ...descend()] : [row]
  })

/**
 * A root row counts as depth -1, so the depth means the same with or without one. An array's item
 * row opens along with the array. Recursive rows stay closed.
 */
export const expandedToDepth = (shape: TreeShape, maxDepth: number) => {
  const offset = hasRootRow(shape.root) ? 1 : 0
  return new Set(
    walk<string>(shape, (entry, descend) =>
      entry.level >= maxDepth + offset || entry.recursiveTarget || !entry.hasChildren
        ? []
        : [entry.id, ...descend()],
    ),
  )
}

export const isWithin = (id: string, ancestorId: string) => id.startsWith(`${ancestorId}/`)
