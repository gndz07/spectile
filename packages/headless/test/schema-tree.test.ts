import { describe, expect, it, vi } from "vitest";
import { type SchemaTree, createSchemaTree, schemaRowLabel, schemaTypeLabel } from "../src";
import { model, schemaRef } from "./fixture";

const userTree = (options?: { defaultExpandedDepth?: number }) =>
  createSchemaTree(model, schemaRef("User"), options);

const ids = (tree: SchemaTree) => tree.getSnapshot().rows.map(({ id }) => id);

const rowOf = (tree: SchemaTree, id: string) => {
  const row = tree.getSnapshot().rows.find((candidate) => candidate.id === id);
  if (!row) throw new Error(`No row ${id}`);
  return row;
};

const press = (tree: SchemaTree, id: string, key: string) => {
  const preventDefault = vi.fn();
  tree.getRowProps(rowOf(tree, id)).onKeyDown({ key, preventDefault });
  return preventDefault.mock.calls.length > 0;
};

const NAME = "#/properties/name";
const FRIENDS = "#/properties/friends";
const FRIEND = "#/properties/friends/items";
const PROFILE = "#/properties/profile";
const BIO = "#/properties/profile/properties/bio";

describe("createSchemaTree", () => {
  it("lists the root's children collapsed by default", () => {
    const tree = userTree();
    const { root, rows } = tree.getSnapshot();
    expect(root.refName).toBe("User");
    expect(rows).toMatchObject([
      { id: NAME, kind: "property", name: "name", required: true, depth: 0, expandable: false },
      { id: FRIENDS, name: "friends", required: false, expandable: true, expanded: false },
      { id: PROFILE, name: "profile", expandable: true, node: { refName: "Profile" } },
    ]);
  });

  it("expands and collapses rows", () => {
    const tree = userTree();
    tree.toggle(FRIENDS);
    expect(ids(tree)).toEqual([NAME, FRIENDS, FRIEND, PROFILE]);
    expect(rowOf(tree, FRIEND)).toMatchObject({
      kind: "items",
      parentId: FRIENDS,
      depth: 1,
      recursive: true,
      node: { refName: "User", circular: true },
    });
    tree.toggle(FRIENDS);
    expect(ids(tree)).toEqual([NAME, FRIENDS, PROFILE]);
  });

  it("lets recursive rows be expanded by hand", () => {
    const tree = userTree();
    tree.expand(FRIENDS);
    tree.expand(FRIEND);
    expect(ids(tree)).toContain(`${FRIEND}/properties/friends`);
  });

  it("expands to a depth without following recursive schemas", () => {
    const expected = [NAME, FRIENDS, FRIEND, PROFILE, BIO];
    expect(ids(userTree({ defaultExpandedDepth: Infinity }))).toEqual(expected);
    const tree = userTree();
    tree.expandAll();
    expect(ids(tree)).toEqual(expected);
    tree.collapseAll();
    expect(ids(tree)).toEqual([NAME, FRIENDS, PROFILE]);
  });

  it("lists composition variants", () => {
    const tree = createSchemaTree(model, schemaRef("Pet"));
    expect(tree.getSnapshot().rows).toMatchObject([
      { id: "#/oneOf/0", kind: "oneOf", index: 0, position: 1, setSize: 2, node: { refName: "Cat" } },
      { id: "#/oneOf/1", kind: "oneOf", index: 1, position: 2, setSize: 2, node: { refName: "Dog" } },
    ]);
  });

  it("has no rows for a primitive root", () => {
    const tree = createSchemaTree(model, schemaRef("Name"));
    expect(tree.getSnapshot()).toMatchObject({ root: { types: ["string"] }, rows: [] });
  });

  it("only notifies subscribers about real changes", () => {
    const tree = userTree();
    const listener = vi.fn();
    tree.subscribe(listener);
    tree.collapse(FRIENDS);
    tree.expand(FRIENDS);
    tree.expand(FRIENDS);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("labels row types with schema names where it can", () => {
    const tree = userTree();
    expect(tree.getSnapshot().rows.map(({ node }) => schemaTypeLabel(node))).toEqual([
      "string",
      "User[]",
      "Profile",
    ]);
    const pet = createSchemaTree(model, schemaRef("Pet")).getSnapshot().root;
    expect(schemaTypeLabel({ ...pet, refName: undefined })).toBe("oneOf");
  });

  it("labels rows by property name, then schema name, then position", () => {
    const tree = userTree();
    tree.expand(FRIENDS);
    expect(tree.getSnapshot().rows.map(schemaRowLabel)).toEqual(["name", "friends", "User", "profile"]);
    const pet = createSchemaTree(model, schemaRef("Pet"));
    expect(pet.getSnapshot().rows.map(schemaRowLabel)).toEqual(["Cat", "Dog"]);
  });

  it("produces serializable snapshots", () => {
    const tree = userTree({ defaultExpandedDepth: Infinity });
    expect(() => JSON.stringify(tree.getSnapshot())).not.toThrow();
  });
});

describe("schema tree accessibility", () => {
  it("describes rows with treeitem props", () => {
    const tree = userTree();
    tree.expand(FRIENDS);
    expect(tree.getTreeProps()).toEqual({ role: "tree" });
    expect(tree.getRowProps(rowOf(tree, FRIENDS))).toMatchObject({
      role: "treeitem",
      "aria-level": 1,
      "aria-setsize": 3,
      "aria-posinset": 2,
      "aria-expanded": true,
      "data-state": "open",
    });
    expect(tree.getRowProps(rowOf(tree, NAME))).toMatchObject({
      "aria-expanded": undefined,
      "data-state": undefined,
    });
  });

  it("keeps a single tab stop that follows focus", () => {
    const tree = userTree();
    const tabIndexes = () => tree.getSnapshot().rows.map((row) => tree.getRowProps(row).tabIndex);
    expect(tabIndexes()).toEqual([0, -1, -1]);
    tree.focus(PROFILE);
    expect(tabIndexes()).toEqual([-1, -1, 0]);
  });

  it("follows the tree keyboard pattern", () => {
    const tree = userTree();
    const focused = () => tree.getSnapshot().focusedId;

    expect(press(tree, NAME, "ArrowDown")).toBe(true);
    expect(focused()).toBe(FRIENDS);
    press(tree, FRIENDS, "ArrowRight");
    expect(rowOf(tree, FRIENDS).expanded).toBe(true);
    press(tree, FRIENDS, "ArrowRight");
    expect(focused()).toBe(FRIEND);
    press(tree, FRIEND, "ArrowLeft");
    expect(focused()).toBe(FRIENDS);
    press(tree, FRIENDS, "ArrowLeft");
    expect(ids(tree)).toEqual([NAME, FRIENDS, PROFILE]);
    press(tree, FRIENDS, "End");
    expect(focused()).toBe(PROFILE);
    press(tree, PROFILE, "Enter");
    expect(rowOf(tree, PROFILE).expanded).toBe(true);
    press(tree, PROFILE, "Home");
    expect(focused()).toBe(NAME);
    expect(press(tree, NAME, "ArrowLeft")).toBe(false);
    expect(press(tree, NAME, "a")).toBe(false);
  });

  it("moves focus to a row that hides the focused row when it collapses", () => {
    const tree = userTree();
    tree.expand(PROFILE);
    tree.focus(BIO);
    tree.collapse(PROFILE);
    expect(tree.getSnapshot().focusedId).toBe(PROFILE);
    tree.expand(PROFILE);
    tree.focus(BIO);
    tree.collapseAll();
    expect(tree.getSnapshot().focusedId).toBe(PROFILE);
  });

  it("toggles on click", () => {
    const tree = userTree();
    tree.getRowProps(rowOf(tree, PROFILE)).onClick();
    expect(tree.getSnapshot()).toMatchObject({ focusedId: PROFILE });
    expect(rowOf(tree, PROFILE).expanded).toBe(true);
  });
});
