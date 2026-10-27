import { getSchema, normalize } from "@spectile/core"
import { describe, expect, it, vi } from "vitest"
import {
  type SchemaTree,
  createSchemaTree,
  schemaConstraintsLabel,
  schemaDefaultLabel,
  schemaRowLabel,
  schemaTypeLabel,
  variantLabel,
} from "../src"
import { model, schemaRef } from "./fixture"

const userTree = (options?: { defaultExpandedDepth?: number }) =>
  createSchemaTree(model, schemaRef("User"), options)

const ids = (tree: SchemaTree) => tree.getSnapshot().rows.map(({ id }) => id)

const rowOf = (tree: SchemaTree, id: string) => {
  const row = tree.getSnapshot().rows.find((candidate) => candidate.id === id)
  if (!row) throw new Error(`No row ${id}`)
  return row
}

const press = (tree: SchemaTree, id: string, key: string) => {
  const preventDefault = vi.fn()
  tree.getRowProps(rowOf(tree, id)).onKeyDown({ key, preventDefault })
  return preventDefault.mock.calls.length > 0
}

const NAME = "#/properties/name"
const FRIENDS = "#/properties/friends"
const FRIEND = "#/properties/friends/items"
const PROFILE = "#/properties/profile"
const BIO = "#/properties/profile/properties/bio"

describe("createSchemaTree", () => {
  it("lists the root's children collapsed by default", () => {
    const tree = userTree()
    const { root, rows } = tree.getSnapshot()
    expect(root.refName).toBe("User")
    expect(rows).toMatchObject([
      { id: NAME, kind: "property", name: "name", required: true, depth: 0, expandable: false },
      { id: FRIENDS, name: "friends", required: false, expandable: true, expanded: false },
      { id: PROFILE, name: "profile", expandable: true, node: { refName: "Profile" } },
    ])
  })

  it("expands and collapses rows", () => {
    const tree = userTree()
    tree.toggle(FRIENDS)
    expect(ids(tree)).toEqual([NAME, FRIENDS, FRIEND, PROFILE])
    expect(rowOf(tree, FRIEND)).toMatchObject({
      kind: "items",
      parentId: FRIENDS,
      depth: 1,
      recursive: true,
      node: { refName: "User", circular: true },
    })
    tree.toggle(FRIENDS)
    expect(ids(tree)).toEqual([NAME, FRIENDS, PROFILE])
  })

  it("expands a recursive row one level, then links back to the ancestor row", () => {
    const tree = userTree()
    tree.expand(FRIENDS)
    expect(rowOf(tree, FRIEND)).toMatchObject({ recursiveTarget: "#", expandable: true })
    tree.expand(FRIEND)
    expect(rowOf(tree, `${FRIEND}/properties/friends`)).toMatchObject({
      recursive: true,
      recursiveTarget: FRIENDS,
      expandable: false,
    })
  })

  it("reports whether every row is expanded", () => {
    const tree = userTree()
    expect(tree.getSnapshot().allExpanded).toBe(false)
    tree.expandAll()
    expect(tree.getSnapshot().allExpanded).toBe(true)
    tree.collapse(PROFILE)
    expect(tree.getSnapshot().allExpanded).toBe(false)
  })

  it("expands to a depth without following recursive schemas", () => {
    const expected = [NAME, FRIENDS, FRIEND, PROFILE, BIO]
    expect(ids(userTree({ defaultExpandedDepth: Infinity }))).toEqual(expected)
    const tree = userTree()
    tree.expandAll()
    expect(ids(tree)).toEqual(expected)
    tree.collapseAll()
    expect(ids(tree)).toEqual([NAME, FRIENDS, PROFILE])
  })

  it("holds a oneOf root's variant select in a root row, showing the selected variant", () => {
    const tree = createSchemaTree(model, schemaRef("Pet"))
    expect(tree.getSnapshot().rows).toMatchObject([
      {
        id: "#",
        kind: "root",
        depth: 0,
        expanded: true,
        variants: { kind: "oneOf", labels: ["Cat", "Dog"], selected: 0 },
      },
      { id: "#/oneOf/0/properties/meows", parentId: "#", depth: 1, name: "meows" },
    ])
    tree.getVariantSelectProps(rowOf(tree, "#")).onChange({ currentTarget: { value: "1" } })
    expect(ids(tree)).toEqual(["#", "#/oneOf/1/properties/barks"])
    tree.collapseAll()
    expect(ids(tree)).toEqual(["#", "#/oneOf/1/properties/barks"])
  })

  it("moves focus out of a variant that is no longer selected", () => {
    const tree = createSchemaTree(model, schemaRef("Pet"))
    tree.focus("#/oneOf/0/properties/meows")
    tree.selectVariant("#", 1)
    expect(tree.getSnapshot().focusedId).toBe("#")
  })

  it("labels variants by title, discriminator value, schema name, then position", () => {
    const variants = normalize({
      openapi: "3.1.0",
      info: { title: "Variants", version: "1.0.0" },
      components: {
        schemas: {
          Shape: {
            oneOf: [
              { title: "Round", type: "object" },
              { $ref: "#/components/schemas/Square" },
              { type: "object", properties: { kind: { const: "line" } } },
              { $ref: "#/components/schemas/Dot" },
              { type: "string" },
            ],
            discriminator: {
              propertyName: "kind",
              mapping: { square: "#/components/schemas/Square" },
            },
          },
          Square: { type: "object" },
          Dot: { type: "object" },
        },
      },
    })
    const shape = getSchema(variants, "#/components/schemas/Shape")
    expect([0, 1, 2, 3, 4].map((index) => variantLabel(variants, shape, index))).toEqual([
      "Round",
      "square",
      "line",
      "Dot",
      "Option 5",
    ])
  })

  it("has no rows for a primitive root", () => {
    const tree = createSchemaTree(model, schemaRef("Name"))
    expect(tree.getSnapshot()).toMatchObject({ root: { types: ["string"] }, rows: [] })
  })

  it("only notifies subscribers about real changes", () => {
    const tree = userTree()
    const listener = vi.fn()
    tree.subscribe(listener)
    tree.collapse(FRIENDS)
    tree.expand(FRIENDS)
    tree.expand(FRIENDS)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it("labels row types with schema names where it can", () => {
    const tree = userTree()
    expect(tree.getSnapshot().rows.map(({ node }) => schemaTypeLabel(node))).toEqual([
      "string",
      "User[]",
      "Profile",
    ])
    const pet = createSchemaTree(model, schemaRef("Pet")).getSnapshot().root
    expect(schemaTypeLabel({ ...pet, refName: undefined })).toBe("oneOf")
  })

  it("labels unnamed array items when given the model", () => {
    const lists = normalize({
      openapi: "3.1.0",
      info: { title: "Lists", version: "1.0.0" },
      components: {
        schemas: {
          Tags: { type: "array", items: { type: "string" } },
          Notes: { type: "array", items: { type: ["string", "null"] } },
        },
      },
    })
    const label = (name: string, withModel: boolean) =>
      schemaTypeLabel(
        { ...getSchema(lists, `#/components/schemas/${name}`), refName: undefined },
        withModel ? lists : undefined,
      )
    expect(label("Tags", true)).toBe("string[]")
    expect(label("Notes", true)).toBe("(string | null)[]")
    expect(label("Tags", false)).toBe("unknown[]")
  })

  it("labels rows by property name, then schema name, then position", () => {
    const tree = userTree()
    tree.expand(FRIENDS)
    expect(tree.getSnapshot().rows.map(schemaRowLabel)).toEqual([
      "name",
      "friends",
      "User",
      "profile",
    ])
    const pet = createSchemaTree(model, schemaRef("Pet"))
    expect(pet.getSnapshot().rows.map(schemaRowLabel)).toEqual(["Pet", "meows"])
  })

  it("labels formats, defaults and constraints", () => {
    const labels = normalize({
      openapi: "3.1.0",
      info: { title: "Labels", version: "1.0.0" },
      components: {
        schemas: {
          Id: { type: "string", format: "uuid" },
          Ids: { type: "array", items: { type: "string", format: "uuid" } },
          Flag: { type: "boolean", default: true },
          Limit: { type: "integer", minimum: 1, exclusiveMaximum: 100, multipleOf: 5 },
          Sort: { type: "string", enum: ["asc", "desc"], minLength: 3, pattern: "^[a-z]+$" },
          Tags: { type: "array", maxItems: 5, uniqueItems: true },
        },
      },
    })
    const node = (name: string) => ({
      ...getSchema(labels, `#/components/schemas/${name}`),
      refName: undefined,
    })
    expect(schemaTypeLabel(node("Id"))).toBe("string · uuid")
    expect(schemaTypeLabel(node("Ids"), labels)).toBe("(string · uuid)[]")
    expect(schemaDefaultLabel(node("Flag"))).toBe("= true")
    expect(schemaDefaultLabel(node("Id"))).toBeUndefined()
    expect(schemaConstraintsLabel(node("Limit"))).toBe("≥ 1 · < 100 · multiple of 5")
    expect(schemaConstraintsLabel(node("Sort"))).toBe(
      'one of "asc", "desc" · at least 3 characters · matches ^[a-z]+$',
    )
    expect(schemaConstraintsLabel(node("Tags"))).toBe("at most 5 items · unique items")
    expect(schemaConstraintsLabel(node("Id"))).toBeUndefined()
  })

  it("merges allOf parts into one list", () => {
    const merged = normalize({
      openapi: "3.1.0",
      info: { title: "Merged", version: "1.0.0" },
      components: {
        schemas: {
          Base: { type: "object", properties: { id: { type: "string" } } },
          Admin: {
            allOf: [{ $ref: "#/components/schemas/Base" }, { required: ["id"] }],
            properties: { role: { type: "string" } },
          },
        },
      },
    })
    const tree = createSchemaTree(merged, { pointer: "#/components/schemas/Admin", circular: false })
    expect(tree.getSnapshot().rows).toMatchObject([
      { name: "id", required: true },
      { name: "role", required: false },
    ])
  })

  it("produces serializable snapshots", () => {
    const tree = userTree({ defaultExpandedDepth: Infinity })
    expect(() => JSON.stringify(tree.getSnapshot())).not.toThrow()
  })
})

describe("schema tree accessibility", () => {
  it("describes rows with treeitem props", () => {
    const tree = userTree()
    tree.expand(FRIENDS)
    expect(tree.getTreeProps()).toEqual({ role: "tree" })
    expect(tree.getRowProps(rowOf(tree, FRIENDS))).toMatchObject({
      role: "treeitem",
      "aria-level": 1,
      "aria-setsize": 3,
      "aria-posinset": 2,
      "aria-expanded": true,
      "data-state": "open",
    })
    expect(tree.getRowProps(rowOf(tree, NAME))).toMatchObject({
      "aria-expanded": undefined,
      "data-state": undefined,
    })
  })

  it("keeps a single tab stop that follows focus", () => {
    const tree = userTree()
    const tabIndexes = () => tree.getSnapshot().rows.map((row) => tree.getRowProps(row).tabIndex)
    expect(tabIndexes()).toEqual([0, -1, -1])
    tree.focus(PROFILE)
    expect(tabIndexes()).toEqual([-1, -1, 0])
  })

  it("follows the tree keyboard pattern", () => {
    const tree = userTree()
    const focused = () => tree.getSnapshot().focusedId

    expect(press(tree, NAME, "ArrowDown")).toBe(true)
    expect(focused()).toBe(FRIENDS)
    press(tree, FRIENDS, "ArrowRight")
    expect(rowOf(tree, FRIENDS).expanded).toBe(true)
    press(tree, FRIENDS, "ArrowRight")
    expect(focused()).toBe(FRIEND)
    press(tree, FRIEND, "ArrowLeft")
    expect(focused()).toBe(FRIENDS)
    press(tree, FRIENDS, "ArrowLeft")
    expect(ids(tree)).toEqual([NAME, FRIENDS, PROFILE])
    press(tree, FRIENDS, "End")
    expect(focused()).toBe(PROFILE)
    press(tree, PROFILE, "Enter")
    expect(rowOf(tree, PROFILE).expanded).toBe(true)
    press(tree, PROFILE, "Home")
    expect(focused()).toBe(NAME)
    expect(press(tree, NAME, "ArrowLeft")).toBe(false)
    expect(press(tree, NAME, "a")).toBe(false)
  })

  it("moves focus to a row that hides the focused row when it collapses", () => {
    const tree = userTree()
    tree.expand(PROFILE)
    tree.focus(BIO)
    tree.collapse(PROFILE)
    expect(tree.getSnapshot().focusedId).toBe(PROFILE)
    tree.expand(PROFILE)
    tree.focus(BIO)
    tree.collapseAll()
    expect(tree.getSnapshot().focusedId).toBe(PROFILE)
  })

  it("toggles on click", () => {
    const tree = userTree()
    tree.getRowProps(rowOf(tree, PROFILE)).onClick()
    expect(tree.getSnapshot()).toMatchObject({ focusedId: PROFILE })
    expect(rowOf(tree, PROFILE).expanded).toBe(true)
  })

  it("ignores events from a link or button inside the row", () => {
    const tree = userTree()
    const row = { closest: () => row }
    const link = { closest: () => link }
    const props = tree.getRowProps(rowOf(tree, PROFILE))
    props.onClick({ target: link, currentTarget: row })
    props.onFocus({ target: link, currentTarget: row })
    props.onKeyDown({ key: "Enter", preventDefault: () => {}, target: link, currentTarget: row })
    expect(tree.getSnapshot().focusedId).toBeUndefined()
    expect(rowOf(tree, PROFILE).expanded).toBe(false)
    props.onClick({ target: { closest: () => row }, currentTarget: row })
    expect(rowOf(tree, PROFILE).expanded).toBe(true)
  })
})
