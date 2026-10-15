export type TreeAction = { type: "focus" | "expand" | "collapse" | "toggle"; id: string };

export type TreeRow = { id: string; parentId?: string; expandable: boolean; expanded: boolean };

/** WAI-ARIA tree view keyboard behavior for the visible rows. */
export const treeKeyAction = (
  rows: readonly TreeRow[],
  id: string,
  key: string,
): TreeAction | undefined => {
  const index = rows.findIndex((row) => row.id === id);
  const row = rows[index];
  if (!row) return undefined;
  const focus = (target: TreeRow | undefined): TreeAction | undefined =>
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
