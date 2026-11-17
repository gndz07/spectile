import { normalize } from "@spectile/core"
import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
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
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                oneOf: [
                  { title: "Cat", type: "object", properties: { name: { type: "string" } } },
                  { title: "Dog", type: "object", properties: { barks: { type: "boolean" } } },
                ],
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Pet created",
            content: {
              "application/json": { schema: { type: "object", properties: { id: { type: "string" } } } },
            },
          },
          "204": { description: "Nothing" },
        },
      },
    },
    "/health": { get: { operationId: "health", deprecated: true, responses: {} } },
  },
})

beforeEach(() => window.history.replaceState(null, "", "/"))

describe("sidebar layout", () => {
  it("lists operations and shows the active one", () => {
    render(<ApiReference model={model} />)
    const nav = screen.getByRole("tree", { name: "Operations" })
    expect(within(nav).getByRole("treeitem", { name: "pets" })).toBeDefined()
    expect(within(nav).getByRole("treeitem", { name: "Other" })).toBeDefined()
    expect(screen.getByRole("heading", { level: 1, name: "Add a pet" })).toBeDefined()
    expect(screen.getByRole("heading", { name: "Path parameters" })).toBeDefined()
    const body = screen.getByRole("tree", { name: "Request body schema" })
    expect(within(body).getByRole("combobox", { name: "Variant" })).toBeDefined()
    expect(within(body).getAllByRole("treeitem").map((row) => row.textContent)).toEqual([
      expect.stringContaining("body"),
      expect.stringContaining("name"),
    ])

    fireEvent.click(within(nav).getByRole("treeitem", { name: /\/health/ }))
    expect(screen.getByRole("heading", { level: 1, name: "/health" })).toBeDefined()
    expect(window.location.hash).toBe("#health")
  })

  it("filters with search and offers to clear an empty result", () => {
    render(<ApiReference model={model} />)
    const search = screen.getByRole("searchbox", { name: "Search operations" })
    fireEvent.keyDown(document.body, { key: "/" })
    expect(document.activeElement).toBe(search)
    fireEvent.change(search, { target: { value: "zebra" } })
    expect(screen.getByRole("status").textContent).toBe("0 of 2 operations")
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }))
    expect(screen.getByRole("tree", { name: "Operations" })).toBeDefined()
  })

  it("expands responses, showing No content for an empty one", () => {
    render(<ApiReference model={model} tryIt="drawer" />)
    const responses = screen.getByRole("heading", { name: "Responses" }).parentElement!
    fireEvent.click(within(responses).getByRole("button", { name: /204/ }))
    expect(within(responses).getByText("No content")).toBeDefined()
    fireEvent.click(within(responses).getByRole("button", { name: /201/ }))
    fireEvent.click(within(responses).getByRole("button", { name: "Example" }))
    expect(within(responses).getByRole("region", { name: "example" }).textContent).toContain(
      '"id": "string"',
    )
  })

  it("shows Example and Try it tabs in the panel", () => {
    render(<ApiReference model={model} />)
    const panel = screen.getByRole("complementary", { name: "Example and try it" })
    expect(within(panel).getByRole("tab", { name: "Example" }).getAttribute("aria-selected")).toBe(
      "true",
    )
    expect(within(panel).getByRole("combobox", { name: "Response status" })).toHaveProperty(
      "value",
      "201",
    )
    fireEvent.click(within(panel).getByRole("tab", { name: "Try it" }))
    expect(within(panel).getByText("Fill in user_id to send.")).toBeDefined()
    expect(within(panel).getByRole("button", { name: "Send request" })).toHaveProperty(
      "disabled",
      true,
    )
    const curl = within(panel).getByLabelText("curl")
    expect(curl.querySelector("[data-missing]")?.textContent).toBe("{user_id}")
    fireEvent.change(within(panel).getByLabelText("user_id *"), { target: { value: "u1" } })
    expect(within(panel).getByRole("button", { name: "Send request" })).toHaveProperty(
      "disabled",
      false,
    )
  })

  it("opens the drawer from the Try it button and closes it", () => {
    render(<ApiReference model={model} tryIt="drawer" />)
    const button = screen.getByRole("button", { name: "Try it" })
    act(() => button.focus())
    fireEvent.click(button)
    const drawer = screen.getByRole("dialog", { name: "Try it" })
    expect(within(drawer).getByLabelText("user_id *")).toBeDefined()
    fireEvent.click(within(drawer).getByRole("button", { name: "Close" }))
    expect(screen.queryByLabelText("user_id *")).toBeNull()
    expect(document.activeElement).toBe(button)
  })

  it("expands the inline form from its own header, above the parameters", () => {
    render(<ApiReference model={model} tryIt="inline" />)
    const toggles = screen.getAllByRole("button", { name: "Try it" })
    expect(toggles).toHaveLength(1)
    const [toggle] = toggles
    const parameters = screen.getByRole("heading", { name: "Path parameters" })
    expect(toggle!.compareDocumentPosition(parameters) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(toggle!.getAttribute("aria-expanded")).toBe("false")
    expect(screen.queryByLabelText("user_id *")).toBeNull()
    fireEvent.click(toggle!)
    expect(toggle!.getAttribute("aria-expanded")).toBe("true")
    expect(screen.getByLabelText("user_id *")).toBeDefined()
    fireEvent.click(toggle!)
    expect(screen.queryByLabelText("user_id *")).toBeNull()
  })
})
