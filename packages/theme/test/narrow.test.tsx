import { normalize } from "@spectile/core"
import type { FetchLike } from "@spectile/headless"
import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ApiReference } from "../src"

const model = normalize({
  openapi: "3.1.0",
  info: { title: "Petstore", version: "2.1" },
  servers: [{ url: "https://api.example.com" }],
  tags: [{ name: "pets" }],
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
    "/health": { get: { operationId: "health", responses: {} } },
  },
})

const fetch = vi.fn<FetchLike>(async () => ({
  status: 201,
  statusText: "Created",
  headers: { forEach: () => {} },
  text: async () => '{"id":"p1"}',
}))

/** `useWidth` reads the root's width when it mounts. */
const atWidth = (width: number) =>
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ width } as DOMRect)

const button = (name: string) => screen.getByRole("button", { name })

beforeEach(() => window.history.replaceState(null, "", "/"))
afterEach(() => vi.restoreAllMocks())

describe("tablet width", () => {
  it("swaps the sidebar for a top bar whose drawer closes on a pick", () => {
    atWidth(800)
    const { container } = render(<ApiReference model={model} />)
    expect(screen.queryByRole("navigation", { name: "API reference" })).toBeNull()
    expect(container.querySelector(".spectile-breadcrumb")?.textContent).toBe("pets / Add a pet")

    act(() => button("Operations").focus())
    fireEvent.click(button("Operations"))
    const drawer = screen.getByRole("dialog", { name: "Operations" })
    fireEvent.click(within(drawer).getByRole("treeitem", { name: /\/health/ }))
    expect(screen.queryByRole("tree", { name: "Operations" })).toBeNull()
    expect(screen.getByRole("heading", { level: 1, name: "/health" })).toBeDefined()
    expect(container.querySelector(".spectile-breadcrumb")?.textContent).toBe("Other / /health")
    expect(document.activeElement).toBe(button("Operations"))
  })

  it("opens the drawer on the search field from the search button and from /", () => {
    atWidth(800)
    render(<ApiReference model={model} />)
    fireEvent.click(button("Search operations"))
    expect(document.activeElement).toBe(screen.getByRole("searchbox", { name: "Search operations" }))
    const drawer = screen.getByRole("dialog", { name: "Operations" })
    fireEvent.click(within(drawer).getByRole("button", { name: "Close" }))
    expect(screen.queryByRole("searchbox")).toBeNull()

    fireEvent.keyDown(document.body, { key: "/" })
    expect(document.activeElement).toBe(screen.getByRole("searchbox", { name: "Search operations" }))
  })

  it("falls back from the panel to the drawer", () => {
    atWidth(800)
    render(<ApiReference model={model} />)
    expect(screen.queryByRole("complementary", { name: "Example and try it" })).toBeNull()
    fireEvent.click(button("Try it"))
    expect(screen.getByRole("dialog", { name: "Try it" }).className).toContain("spectile-drawer")
  })
})

describe("phone width", () => {
  it("opens the sheet, shows the response after Send, and goes back to edit", async () => {
    atWidth(375)
    render(<ApiReference model={model} tryItOptions={{ fetch }} />)
    fireEvent.click(button("Try it"))
    const sheet = screen.getByRole("dialog", { name: "Try it" })
    expect(sheet.className).toContain("spectile-sheet")
    const tab = (name: string) => within(sheet).getByRole("tab", { name })
    expect(tab("Request").getAttribute("aria-selected")).toBe("true")

    fireEvent.change(within(sheet).getByLabelText("user_id *"), { target: { value: "u1" } })
    fireEvent.click(within(sheet).getByRole("button", { name: "Send request" }))
    expect(tab("Response").getAttribute("aria-selected")).toBe("true")
    expect((await within(sheet).findByText("201 Created")).className).toContain("spectile-chip")
    expect(within(sheet).getByRole("button", { name: "Send again" })).toBeDefined()

    fireEvent.click(within(sheet).getByRole("button", { name: "Edit request" }))
    expect(within(sheet).getByLabelText("user_id *")).toHaveProperty("value", "u1")
  })

  it("uses the sheet whatever tryIt asks for", () => {
    atWidth(375)
    render(<ApiReference model={model} tryIt="inline" />)
    fireEvent.click(button("Try it"))
    const sheet = screen.getByRole("dialog", { name: "Try it" })
    expect(sheet.className).toContain("spectile-sheet")
    fireEvent.click(within(sheet).getByRole("tab", { name: "Response" }))
    expect(within(sheet).getByText("Send the request to see its response.")).toBeDefined()
  })
})
