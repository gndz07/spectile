import { findOperation } from "@spectile/core"
import { describe, expect, it, vi } from "vitest"
import { type Navigation, createNavigation } from "../src"
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
