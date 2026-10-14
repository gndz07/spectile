import {
  type SchemaNode,
  type SchemaRef,
  type SpecModel,
  appendPointer,
  getSchema,
} from "@spectile/core";
import type { KeyboardEventLike } from "./events";
import { createStore, memoizeLast, select } from "./store";

export type SchemaRowKind =
  | "property"
  | "additionalProperties"
  | "items"
  | "allOf"
  | "oneOf"
  | "anyOf"
  | "not";

export type SchemaChild = {
  segments: (string | number)[];
  kind: SchemaRowKind;
  name?: string;
  index?: number;
  required: boolean;
  schema: SchemaRef;
};

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

export type TreeAction = { type: "focus" | "expand" | "collapse" | "toggle"; id: string };

export type SchemaTreeOptions = { defaultExpandedDepth?: number };

export type SchemaTreeSnapshot = {
  root: SchemaNode;
  rows: SchemaRow[];
  focusedId?: string;
  tabStopId?: string;
};

type GetNode = (pointer: string) => SchemaNode;

const ROOT_ID = "#";
const COMPOSITIONS = ["allOf", "oneOf", "anyOf"] as const;

const single = (
  kind: "additionalProperties" | "items" | "not",
  schema: SchemaRef | boolean | undefined,
): SchemaChild[] =>
  typeof schema === "object" ? [{ segments: [kind], kind, required: false, schema }] : [];

export const schemaChildren = (node: SchemaNode): SchemaChild[] => [
  ...node.properties.map(({ name, required, schema }): SchemaChild => ({
    segments: ["properties", name],
    kind: "property",
    name,
    required,
    schema,
  })),
  ...single("additionalProperties", node.additionalProperties),
  ...single("items", node.items),
  ...COMPOSITIONS.flatMap((kind) =>
    node[kind].map((schema, index): SchemaChild => ({
      segments: [kind, index],
      kind,
      index,
      required: false,
      schema,
    })),
  ),
  ...single("not", node.not),
];

const childEntries = (getNode: GetNode, parent: SchemaNode, parentId: string) =>
  schemaChildren(parent).map((child) => ({
    child,
    id: appendPointer(parentId, ...child.segments),
    node: getNode(child.schema.pointer),
  }));

const isExpandable = (node: SchemaNode) => schemaChildren(node).length > 0;

const isWithin = (id: string, ancestorId: string) => id.startsWith(`${ancestorId}/`);

export const buildRows = (
  getNode: GetNode,
  root: SchemaNode,
  expanded: ReadonlySet<string>,
): SchemaRow[] => {
  const visit = (
    parent: SchemaNode,
    parentId: string | undefined,
    depth: number,
    ancestors: ReadonlySet<string>,
  ): SchemaRow[] => {
    const entries = childEntries(getNode, parent, parentId ?? ROOT_ID);
    return entries.flatMap(({ child: { segments, schema, ...child }, id, node }, index) => {
      const expandable = isExpandable(node);
      const row: SchemaRow = {
        ...child,
        id,
        parentId,
        depth,
        node,
        expandable,
        expanded: expandable && expanded.has(id),
        recursive: ancestors.has(node.pointer),
        setSize: entries.length,
        position: index + 1,
      };
      if (!row.expanded) return [row];
      return [row, ...visit(node, id, depth + 1, new Set([...ancestors, node.pointer]))];
    });
  };
  return visit(root, undefined, 0, new Set([root.pointer]));
};

export const expandedToDepth = (getNode: GetNode, root: SchemaNode, maxDepth: number) => {
  const visit = (
    parent: SchemaNode,
    parentId: string,
    depth: number,
    ancestors: ReadonlySet<string>,
  ): string[] => {
    if (depth >= maxDepth) return [];
    return childEntries(getNode, parent, parentId).flatMap(({ id, node }) => {
      if (ancestors.has(node.pointer) || !isExpandable(node)) return [];
      return [id, ...visit(node, id, depth + 1, new Set([...ancestors, node.pointer]))];
    });
  };
  return new Set(visit(root, ROOT_ID, 0, new Set([root.pointer])));
};

export const treeKeyAction = (
  rows: readonly SchemaRow[],
  id: string,
  key: string,
): TreeAction | undefined => {
  const index = rows.findIndex((row) => row.id === id);
  const row = rows[index];
  if (!row) return undefined;
  const focus = (target: SchemaRow | undefined): TreeAction | undefined =>
    target && { type: "focus", id: target.id };

  switch (key) {
    case "ArrowDown":
      return focus(rows[index + 1]);
    case "ArrowUp":
      return focus(rows[index - 1]);
    case "Home":
      return focus(rows[0]);
    case "End":
      return focus(rows.at(-1));
    case "ArrowRight":
      if (!row.expandable) return undefined;
      return row.expanded ? focus(rows[index + 1]) : { type: "expand", id };
    case "ArrowLeft":
      if (row.expanded) return { type: "collapse", id };
      return row.parentId === undefined ? undefined : { type: "focus", id: row.parentId };
    case "Enter":
    case " ":
      return row.expandable ? { type: "toggle", id } : undefined;
    default:
      return undefined;
  }
};

type TreeState = { expanded: ReadonlySet<string>; focusedId?: string };

export const createSchemaTree = (
  model: SpecModel,
  rootRef: SchemaRef,
  { defaultExpandedDepth = 0 }: SchemaTreeOptions = {},
) => {
  const nodes = new Map<string, SchemaNode>();
  const getNode: GetNode = (pointer) => {
    const cached = nodes.get(pointer);
    if (cached) return cached;
    const node = getSchema(model, pointer);
    nodes.set(pointer, node);
    return node;
  };

  const root = getNode(rootRef.pointer);
  const store = createStore<TreeState>({
    expanded: expandedToDepth(getNode, root, defaultExpandedDepth),
  });
  const rowsFor = memoizeLast((expanded: ReadonlySet<string>) => buildRows(getNode, root, expanded));
  const view = select(store, ({ expanded, focusedId }): SchemaTreeSnapshot => {
    const rows = rowsFor(expanded);
    const focusVisible = rows.some((row) => row.id === focusedId);
    return { root, rows, focusedId, tabStopId: focusVisible ? focusedId : rows[0]?.id };
  });

  const focus = (id: string) => store.setState({ focusedId: id });

  const setExpanded = (id: string, open: boolean) =>
    store.setState((state) => {
      if (state.expanded.has(id) === open) return state;
      const expanded = new Set(state.expanded);
      if (open) expanded.add(id);
      else expanded.delete(id);
      const hidesFocus = !open && state.focusedId !== undefined && isWithin(state.focusedId, id);
      return { expanded, focusedId: hidesFocus ? id : state.focusedId };
    });

  const expand = (id: string) => setExpanded(id, true);
  const collapse = (id: string) => setExpanded(id, false);
  const toggle = (id: string) => setExpanded(id, !store.getSnapshot().expanded.has(id));

  const expandAll = () => store.setState({ expanded: expandedToDepth(getNode, root, Infinity) });

  const collapseAll = () =>
    store.setState(({ focusedId }) => {
      const containsFocus = (row: SchemaRow) =>
        focusedId !== undefined && (row.id === focusedId || isWithin(focusedId, row.id));
      const topLevel = view.getSnapshot().rows.find((row) => row.depth === 0 && containsFocus(row));
      return { expanded: new Set(), focusedId: topLevel?.id ?? focusedId };
    });

  const actions: Record<TreeAction["type"], (id: string) => void> = {
    focus,
    expand,
    collapse,
    toggle,
  };

  const getTreeProps = () => ({ role: "tree" as const });

  const getRowProps = (row: SchemaRow) => ({
    role: "treeitem" as const,
    "aria-level": row.depth + 1,
    "aria-setsize": row.setSize,
    "aria-posinset": row.position,
    "aria-expanded": row.expandable ? row.expanded : undefined,
    tabIndex: row.id === view.getSnapshot().tabStopId ? 0 : -1,
    "data-state": row.expandable ? (row.expanded ? "open" : "closed") : undefined,
    "data-depth": row.depth,
    onKeyDown: (event: KeyboardEventLike) => {
      const action = treeKeyAction(view.getSnapshot().rows, row.id, event.key);
      if (!action) return;
      event.preventDefault();
      actions[action.type](action.id);
    },
    onClick: () => {
      focus(row.id);
      if (row.expandable) toggle(row.id);
    },
    onFocus: () => focus(row.id),
  });

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
  };
};

export type SchemaTree = ReturnType<typeof createSchemaTree>;
