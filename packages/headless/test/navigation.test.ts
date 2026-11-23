import { findOperation } from "@spectile/core"
import { describe, expect, it, vi } from "vitest"
import {
  type KeyboardEventLike,
  type Navigation,
  createNavigation,
  firstGroupOf,
  isSearchShortcut,
  matchRanges,
  operationHash,
  parseOperationHash,
} from "../src"
import { model } from "./fixture"

const groupIds = (navigation: Navigation) =>
  navigation
    .getSnapshot()
    .groups.map(({ kind, tag, operations }) => [
      tag?.name ?? kind,
      operations.map(({ id }) => id),
    ])

const operation = (id: string) => {
  const found = findOperation(model, id)
  if (!found) throw new Error(`No operation ${id}`)
  return found
}

describe("createNavigation", () => {
  it("groups operations by tag, then untagged operations, then webhooks", () => {
    expect(groupIds(createNavigation(model))).toEqual([
      ["users", ["listUsers", "createUser"]],
      ["pets", ["getPet"]],
      ["admin", ["createUser"]],
      ["operation", ["health"]],
      ["webhook", ["webhook-post-usercreated"]],
    ])
  })

  it("filters by every search term and drops empty groups", () => {
    const navigation = createNavigation(model)
    navigation.setQuery("POST user")
    expect(groupIds(navigation)).toEqual([
      ["users", ["createUser"]],
      ["admin", ["createUser"]],
      ["webhook", ["webhook-post-usercreated"]],
    ])
    expect(navigation.getSnapshot().resultCount).toBe(2)
    navigation.setQuery("webhook")
    expect(groupIds(navigation)).toEqual([["webhook", ["webhook-post-usercreated"]]])
    navigation.setQuery("  ")
    expect(navigation.getSnapshot().resultCount).toBe(5)
  })

  it("can make a webhook active", () => {
    const navigation = createNavigation(model)
    navigation.getItemProps(operation("webhook-post-usercreated")).onClick()
    expect(navigation.getSnapshot().active).toMatchObject({ kind: "webhook", path: "userCreated" })
  })

  it("tracks the active operation", () => {
    const navigation = createNavigation(model, { activeId: "getPet" })
    expect(navigation.getSnapshot().active?.path).toBe("/pets/{id}")
    navigation.getItemProps(operation("health")).onClick()
    expect(navigation.getSnapshot()).toMatchObject({ activeId: "health", active: { id: "health" } })
  })

  it("describes items with aria and data attributes", () => {
    const navigation = createNavigation(model, { activeId: "createUser" })
    expect(navigation.getItemProps(operation("createUser"))).toMatchObject({
      "aria-current": "page",
      "data-state": "active",
      "data-method": "post",
      "data-deprecated": "",
    })
    expect(navigation.getItemProps(operation("listUsers"))).toMatchObject({
      "aria-current": undefined,
      "data-state": "inactive",
      "data-deprecated": undefined,
    })
  })

  it("updates the query from search input", () => {
    const navigation = createNavigation(model)
    navigation.getSearchProps().onChange({ currentTarget: { value: "pet" } })
    expect(navigation.getSearchProps()).toMatchObject({ type: "search", value: "pet" })
  })

  it("follows the tree keyboard pattern over groups and items", () => {
    const navigation = createNavigation(model, { activeId: "getPet" })
    const [users, pets] = navigation.getSnapshot().groups
    const press = (props: { onKeyDown?: (event: KeyboardEventLike) => void }, key: string) =>
      props.onKeyDown?.({ key, preventDefault: () => {} })
    const snapshot = () => navigation.getSnapshot()
    const rowIds = () => snapshot().rows.map(({ id, operation }) => operation?.id ?? id)

    const petItem = navigation.getItemProps(operation("getPet"), pets)
    expect(petItem).toMatchObject({ role: "treeitem", tabIndex: 0 })
    expect(navigation.getGroupProps(users!)).toMatchObject({ tabIndex: -1, "aria-expanded": true })

    press(petItem, "ArrowLeft")
    expect(snapshot().focusedId).toBe("tag:pets")
    press(navigation.getGroupProps(pets!), "ArrowLeft")
    expect(rowIds()).not.toContain("getPet")
    expect(navigation.getGroupProps(pets!)).toMatchObject({ "aria-expanded": false, tabIndex: 0 })
    press(navigation.getGroupProps(pets!), "ArrowRight")
    expect(rowIds()).toContain("getPet")

    press(navigation.getGroupProps(pets!), "Home")
    expect(snapshot().focusedId).toBe("tag:users")
    press(navigation.getGroupProps(users!), "ArrowDown")
    press(navigation.getItemProps(operation("listUsers"), users), "End")
    expect(rowIds().at(-1)).toBe("webhook-post-usercreated")
    expect(snapshot().focusedId).toBe(snapshot().rows.at(-1)?.id)
  })

  it("gives groups and items their level and position in the tree", () => {
    const navigation = createNavigation(model)
    const [users, pets] = navigation.getSnapshot().groups
    expect(navigation.getGroupProps(pets!)).toMatchObject({
      "aria-level": 1,
      "aria-setsize": 5,
      "aria-posinset": 2,
    })
    expect(navigation.getItemProps(operation("createUser"), users)).toMatchObject({
      "aria-level": 2,
      "aria-setsize": 2,
      "aria-posinset": 2,
    })
    expect(navigation.getItemProps(operation("createUser"))).not.toHaveProperty("aria-level")
  })

  it("activates an item on Enter or Space unless the browser clicks it already", () => {
    const navigation = createNavigation(model)
    const pets = navigation.getSnapshot().groups[1]!
    const press = (key: string, currentTarget?: object) => {
      const preventDefault = vi.fn()
      navigation.getItemProps(operation("getPet"), pets).onKeyDown?.({
        key,
        preventDefault,
        currentTarget,
      })
      return preventDefault.mock.calls.length > 0
    }

    expect(press("Enter")).toBe(true)
    expect(navigation.getSnapshot().activeId).toBe("getPet")

    const listItem = { tagName: "LI", click: vi.fn() }
    expect(press(" ", listItem)).toBe(true)
    expect(listItem.click).toHaveBeenCalledOnce()

    const button = { tagName: "BUTTON", click: vi.fn() }
    expect(press("Enter", button)).toBe(false)
    expect(press(" ", button)).toBe(false)
    expect(button.click).not.toHaveBeenCalled()

    const link = { tagName: "A", click: vi.fn() }
    expect(press("Enter", link)).toBe(false)
    expect(press(" ", link)).toBe(true)
    expect(link.click).toHaveBeenCalledOnce()
  })

  it("moves focus to a group that hides it, and opens every group while searching", () => {
    const navigation = createNavigation(model)
    const users = navigation.getSnapshot().groups[0]!
    navigation.getItemProps(operation("listUsers"), users).onFocus?.()
    navigation.getGroupToggleProps(users).onClick()
    expect(navigation.getSnapshot().focusedId).toBe("tag:users")
    navigation.setQuery("list")
    expect(navigation.getSnapshot().rows.map(({ id }) => id)).toEqual([
      "tag:users",
      "tag:users\u001flistUsers",
    ])
  })

  it("does not recompute groups when only the active operation changes", () => {
    const navigation = createNavigation(model)
    const { groups } = navigation.getSnapshot()
    const listener = vi.fn()
    navigation.subscribe(listener)
    navigation.setActive("health")
    navigation.setActive("health")
    expect(navigation.getSnapshot().groups).toBe(groups)
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

describe("firstGroupOf", () => {
  it("finds the first group listing an operation, and webhooks under Webhooks", () => {
    expect(firstGroupOf(model, "createUser")?.tag?.name).toBe("users")
    expect(firstGroupOf(model, "health")?.tag).toBeUndefined()
    expect(firstGroupOf(model, model.webhooks[0]!.id)?.kind).toBe("webhook")
    expect(firstGroupOf(model, "missing")).toBeUndefined()
  })
})

describe("search helpers", () => {
  it("finds where the terms match, joining overlaps", () => {
    expect(matchRanges("List users", "USER s")).toEqual([
      { start: 2, end: 3 },
      { start: 5, end: 10 },
    ])
    expect(matchRanges("List users", " ")).toEqual([])
  })

  it("treats / outside text fields as the search shortcut", () => {
    const field = { closest: (selector: string) => (selector.includes("input") ? field : null) }
    const row = { closest: () => null }
    expect(isSearchShortcut({ key: "/", target: row })).toBe(true)
    expect(isSearchShortcut({ key: "/", target: field })).toBe(false)
    expect(isSearchShortcut({ key: "/", ctrlKey: true, target: row })).toBe(false)
    expect(isSearchShortcut({ key: "?", target: row })).toBe(false)
  })

  it("round-trips operation ids through the URL hash", () => {
    expect(operationHash("get /pets")).toBe("#get%20%2Fpets")
    expect(parseOperationHash(operationHash("get /pets"))).toBe("get /pets")
    expect(parseOperationHash("#")).toBeUndefined()
    expect(parseOperationHash("#%E0%A4%A")).toBeUndefined()
  })
})
