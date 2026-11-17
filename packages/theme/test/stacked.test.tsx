import { normalize } from "@spectile/core"
import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ApiReference } from "../src"

const model = normalize({
  openapi: "3.1.0",
  info: { title: "Petstore", version: "2.1" },
  servers: [{ url: "https://api.example.com" }],
  tags: [{ name: "pets", description: "Everything about pets." }],
  paths: {
    "/users/{user_id}/pets": {
      post: {
        operationId: "addPet",
        summary: "Add a pet",
        tags: ["pets"],
        parameters: [{ name: "user_id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "201": { description: "Pet created" } },
      },
    },
    "/health": { get: { operationId: "health", summary: "Health", responses: {} } },
  },
})

const toggle = (name: RegExp) => screen.getByRole("button", { name })

const { scrollIntoView } = Element.prototype

beforeEach(() => window.history.replaceState(null, "", "/"))
afterEach(() => {
  Element.prototype.scrollIntoView = scrollIntoView
})

describe("stacked layout", () => {
  it("groups collapsed rows by tag, with the tag description", () => {
    render(<ApiReference model={model} layout="stacked" />)
    expect(screen.getByRole("heading", { level: 1, name: "Petstore" })).toBeDefined()
    expect(screen.getByRole("heading", { level: 2, name: "Pets" })).toBeDefined()
    expect(screen.getByText("Everything about pets.")).toBeDefined()
    expect(screen.getByRole("heading", { level: 2, name: "Other" })).toBeDefined()
    expect(toggle(/Add a pet/).getAttribute("aria-expanded")).toBe("false")
    expect(screen.queryByRole("heading", { name: "Responses" })).toBeNull()
  })

  it("opens several rows at once and writes the hash", () => {
    render(<ApiReference model={model} layout="stacked" />)
    fireEvent.click(toggle(/Add a pet/))
    fireEvent.click(toggle(/Health/))
    expect(toggle(/Add a pet/).getAttribute("aria-expanded")).toBe("true")
    expect(toggle(/Health/).getAttribute("aria-expanded")).toBe("true")
    expect(screen.getByRole("heading", { level: 4, name: "Path parameters" })).toBeDefined()
    expect(screen.getAllByRole("heading", { level: 4, name: "Responses" })).toHaveLength(1)
    expect(window.location.hash).toBe("#health")

    fireEvent.click(toggle(/Add a pet/))
    expect(screen.queryByRole("heading", { name: "Path parameters" })).toBeNull()
  })

  it("opens the operation a deep link names", () => {
    window.history.replaceState(null, "", "/#addPet")
    render(<ApiReference model={model} layout="stacked" />)
    expect(toggle(/Add a pet/).getAttribute("aria-expanded")).toBe("true")

    act(() => {
      window.history.replaceState(null, "", "/#health")
      window.dispatchEvent(new HashChangeEvent("hashchange"))
    })
    expect(toggle(/Health/).getAttribute("aria-expanded")).toBe("true")
    expect(toggle(/Add a pet/).getAttribute("aria-expanded")).toBe("true")
  })

  it("filters rows, and puts a Try it button in each row for the drawer", () => {
    render(<ApiReference model={model} layout="stacked" tryIt="drawer" />)
    fireEvent.change(screen.getByRole("searchbox", { name: "Search operations" }), {
      target: { value: "health" },
    })
    expect(screen.getByRole("status").textContent).toBe("1 of 2 operations")
    expect(screen.queryByRole("button", { name: /Add a pet/ })).toBeNull()

    fireEvent.click(toggle(/Health/))
    const row = toggle(/Health/).closest("section")!
    expect(within(row).getByRole("button", { name: "Try it" })).toBeDefined()
  })

  it("shows the open row used last in the panel", () => {
    render(<ApiReference model={model} layout="stacked" tryIt="panel" />)
    const panel = () => screen.getByRole("complementary", { name: "Example and try it" })
    expect(panel().textContent).toContain("Open an operation")
    expect(screen.queryByRole("button", { name: "Try it" })).toBeNull()

    fireEvent.click(toggle(/Add a pet/))
    fireEvent.click(toggle(/Health/))
    expect(screen.getAllByRole("complementary", { name: "Example and try it" })).toHaveLength(1)
    expect(toggle(/Health/).closest("section")?.hasAttribute("data-active")).toBe(true)

    fireEvent.pointerDown(screen.getByRole("heading", { level: 4, name: "Path parameters" }))
    expect(toggle(/Add a pet/).closest("section")?.hasAttribute("data-active")).toBe(true)
    expect(within(panel()).getByRole("combobox", { name: "Response status" })).toBeDefined()

    fireEvent.click(toggle(/Add a pet/))
    expect(toggle(/Health/).closest("section")?.hasAttribute("data-active")).toBe(true)
  })

  it("scrolls back to a deep link followed a second time", () => {
    const scrolled = vi.fn()
    Element.prototype.scrollIntoView = scrolled
    window.history.replaceState(null, "", "/#addPet")
    render(<ApiReference model={model} layout="stacked" />)
    expect(scrolled).toHaveBeenCalledTimes(1)

    const link = document.body.appendChild(document.createElement("a"))
    link.href = "#addPet"
    fireEvent.click(link)
    expect(scrolled).toHaveBeenCalledTimes(2)
    expect(scrolled.mock.contexts.at(-1)).toBe(toggle(/Add a pet/).closest("section"))
    link.remove()
  })

  it("treats an operation under two tags as two rows", () => {
    const twoTags = normalize({
      openapi: "3.1.0",
      info: { title: "Petstore", version: "2.1" },
      paths: {
        "/pets": {
          get: { operationId: "listPets", summary: "List pets", tags: ["pets", "store"], responses: {} },
        },
      },
    })
    window.history.replaceState(null, "", "/#listPets")
    render(<ApiReference model={twoTags} layout="stacked" tryIt="panel" />)
    const [first, second] = screen.getAllByRole("button", { name: /List pets/ })
    expect(first?.getAttribute("aria-expanded")).toBe("true")
    expect(second?.getAttribute("aria-expanded")).toBe("false")

    fireEvent.click(second!)
    expect(screen.getAllByRole("complementary", { name: "Example and try it" })).toHaveLength(1)
    expect(second?.closest("section")?.hasAttribute("data-active")).toBe(true)
    expect(first?.closest("section")?.hasAttribute("data-active")).toBe(false)
  })

  it("keeps the search shortcut off by default", () => {
    render(<ApiReference model={model} layout="stacked" />)
    fireEvent.keyDown(document.body, { key: "/" })
    expect(document.activeElement).toBe(document.body)
  })
})
