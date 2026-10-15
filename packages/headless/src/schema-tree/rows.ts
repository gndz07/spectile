import type { SchemaNode } from "@spectile/core";
import { type GetNode, type SchemaChild, childEntries, isExpandable } from "./children";

export type SchemaRow = Omit<SchemaChild, "segments" | "schema"> & {
  id: string;
  parentId?: string;
  depth: number;
  node: SchemaNode;
  expandable: boolean;
  expanded: boolean;
  recursive: boolean;
  setSize: number;
  position: number;
};

type WalkEntry = ReturnType<typeof childEntries>[number] &
  Pick<SchemaRow, "parentId" | "depth" | "recursive" | "setSize" | "position">;

const ROOT_ID = "#";

/** Depth-first over the tree; `visit` decides what each child yields and whether to `descend`. */
const walk = <T>(
  getNode: GetNode,
  root: SchemaNode,
  visit: (entry: WalkEntry, descend: () => T[]) => T[],
): T[] => {
  const step = (
    parent: SchemaNode,
    parentId: string | undefined,
    depth: number,
    ancestors: ReadonlySet<string>,
  ): T[] => {
    const entries = childEntries(getNode, parent, parentId ?? ROOT_ID);
    return entries.flatMap((entry, index) =>
      visit(
        {
          ...entry,
          parentId,
          depth,
          recursive: ancestors.has(entry.node.pointer),
          setSize: entries.length,
          position: index + 1,
        },
        () => step(entry.node, entry.id, depth + 1, new Set([...ancestors, entry.node.pointer])),
      ),
    );
  };
  return step(root, undefined, 0, new Set([root.pointer]));
};

export const buildRows = (
  getNode: GetNode,
  root: SchemaNode,
  expanded: ReadonlySet<string>,
): SchemaRow[] =>
  walk<SchemaRow>(getNode, root, ({ child: { segments, schema, ...child }, ...entry }, descend) => {
    const expandable = isExpandable(entry.node);
    const row: SchemaRow = {
      ...child,
      ...entry,
      expandable,
      expanded: expandable && expanded.has(entry.id),
    };
    return row.expanded ? [row, ...descend()] : [row];
  });

export const expandedToDepth = (getNode: GetNode, root: SchemaNode, maxDepth: number) =>
  new Set(
    walk<string>(getNode, root, ({ id, node, depth, recursive }, descend) =>
      depth >= maxDepth || recursive || !isExpandable(node) ? [] : [id, ...descend()],
    ),
  );

export const isWithin = (id: string, ancestorId: string) => id.startsWith(`${ancestorId}/`);
