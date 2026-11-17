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
                  {
                    title: "Cat",
                    type: "object",
                    properties: { id: { type: "string", readOnly: true }, name: { type: "string" } },
                  },
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
          default: { description: "" },
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
    expect(within(nav).getByRole("treeitem", { name: "Pets" })).toBeDefined()
    expect(within(nav).getByRole("treeitem", { name: "Other" })).toBeDefined()
    expect(screen.getByRole("heading", { level: 1, name: "Add a pet" })).toBeDefined()
    expect(screen.getByRole("heading", { name: "Path parameters" })).toBeDefined()
    const body = screen.getByRole("tree", { name: "Request body schema" })
    expect(within(body).getByRole("combobox", { name: "Variant" })).toBeDefined()
    expect(within(body).getAllByRole("treeitem").map((row) => row.textContent)).toEqual([
      expect.stringContaining("One of"),
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
    expect(within(responses).getByText("No content", { selector: "p" })).toBeDefined()
    fireEvent.click(within(responses).getByRole("button", { name: /201/ }))
    fireEvent.click(within(responses).getByRole("button", { name: "Example" }))
    expect(within(responses).getByRole("region", { name: "example" }).textContent).toContain(
      '"id": "usr_8f2k1q"',
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
    expect(within(panel).queryByLabelText("curl")).toBeNull()
    fireEvent.click(within(panel).getByRole("button", { name: "Show curl" }))
    const curl = within(panel).getByLabelText("curl")
    expect(curl.textContent).toMatch(/^curl 'https:\/\/api\.example\.com\/users\//)
    expect(curl.querySelector("[data-missing]")?.textContent).toBe("{user_id}")
    fireEvent.change(within(panel).getByLabelText("user_id *"), { target: { value: "u1" } })
    expect(within(panel).getByRole("button", { name: "Send request" })).toHaveProperty(
      "disabled",
      false,
    )
    expect(within(panel).getByText("Send the request to see the response here.")).toBeDefined()
  })

  it("resets the body to its example from beside its label", () => {
    render(<ApiReference model={model} />)
    const panel = screen.getByRole("complementary", { name: "Example and try it" })
    fireEvent.click(within(panel).getByRole("tab", { name: "Try it" }))
    const body = within(panel).getByLabelText("Body · JSON") as HTMLTextAreaElement
    const example = body.value
    const reset = within(panel).getByRole("button", { name: "Reset" })
    expect(reset).toHaveProperty("disabled", true)
    fireEvent.change(body, { target: { value: "{}" } })
    expect(reset).toHaveProperty("disabled", false)
    fireEvent.click(reset)
    expect(body.value).toBe(example)
  })

  it("offers the spec's servers and a custom URL", () => {
    const servers = normalize({
      openapi: "3.1.0",
      info: { title: "Servers", version: "1" },
      servers: [
        { url: "https://api.example.com", description: "Production" },
        { url: "https://sandbox.example.com", description: "Sandbox" },
      ],
      paths: { "/ping": { get: { operationId: "ping", responses: {} } } },
    })
    render(<ApiReference model={servers} />)
    const panel = screen.getByRole("complementary", { name: "Example and try it" })
    fireEvent.click(within(panel).getByRole("tab", { name: "Try it" }))
    const select = within(panel).getByRole("combobox", { name: "Server" })
    expect(within(panel).queryByLabelText("Server URL")).toBeNull()
    fireEvent.change(select, { target: { value: "custom" } })
    const url = within(panel).getByLabelText("Server URL") as HTMLInputElement
    expect(url.value).toBe("https://api.example.com")
    fireEvent.change(select, { target: { value: "1" } })
    expect(within(panel).queryByLabelText("Server URL")).toBeNull()
    expect(select).toHaveProperty("value", "1")
  })

  it("notes left-out fields, names the default response and switches the request view", () => {
    render(<ApiReference model={model} />)
    expect(screen.getByText(/^Read-only fields like/).textContent).toBe(
      "Read-only fields like id are set by the server, so they aren't listed here.",
    )
    expect(screen.getByRole("button", { name: "Other Unexpected error" })).toBeDefined()
    expect(screen.getByRole("button", { name: "201 Created" })).toBeDefined()
    const panel = screen.getByRole("complementary", { name: "Example and try it" })
    expect(within(panel).getByLabelText("curl")).toBeDefined()
    fireEvent.click(within(panel).getByRole("button", { name: "JSON" }))
    expect(within(panel).queryByLabelText("curl")).toBeNull()
    expect(within(panel).getByRole("region", { name: "request body" }).textContent).toContain(
      '"name": "Ada Lovelace"',
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
