import { normalize } from "@spectile/core"
import type { LoadResult } from "@spectile/core/loader"
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ApiReference, defaultRenderMarkdown } from "../src"
import { specUrl } from "../src/use-spec"

const loadSpec = vi.hoisted(() => vi.fn<(input: unknown) => Promise<LoadResult>>())

vi.mock("@spectile/core/loader", () => ({ loadSpec }))

const document = {
  openapi: "3.1.0",
  info: { title: "Pets", version: "1.0.0", description: "All **pets**" },
  paths: { "/pets": { get: { operationId: "listPets", responses: {} } } },
}

const empty = { ...document, paths: {} }

beforeEach(() => loadSpec.mockReset())

describe("ApiReference", () => {
  it("renders a ready model with the resolved layout on its root", () => {
    const { container } = render(
      <ApiReference model={normalize(document)} tryIt="panel" className="docs" data-theme="dark" />,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toBe("spectile docs")
    expect(root.dataset).toMatchObject({
      layout: "sidebar",
      navigation: "sidebar",
      tryIt: "panel",
      theme: "dark",
    })
    expect(screen.getByRole("heading", { level: 1, name: "/pets" })).toBeDefined()
  })

  it("loads a spec, showing a skeleton meanwhile and its problems after", async () => {
    loadSpec.mockResolvedValue({
      document,
      warnings: [{ code: "invalid-document", message: "Bad thing", pointer: "#/paths" }],
    })
    render(<ApiReference spec="https://example.com/openapi.json" layout="stacked" tryIt={false} />)
    expect(screen.getByRole("status", { name: "Loading API reference" })).toBeDefined()
    expect(await screen.findByRole("heading", { level: 1, name: "Pets" })).toBeDefined()
    expect(loadSpec).toHaveBeenCalledWith("https://example.com/openapi.json")
    expect(screen.getByText("1 problem found in this spec")).toBeDefined()
    expect(screen.getByText("Bad thing").textContent).toBe("Bad thing #/paths")
  })

  it("offers a retry when the spec fails to load", async () => {
    loadSpec.mockRejectedValueOnce(new Error("404 Not Found"))
    loadSpec.mockResolvedValueOnce({ document, warnings: [] })
    render(<ApiReference spec="/missing.json" />)
    expect((await screen.findByRole("alert")).textContent).toContain("404 Not Found")
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(await screen.findByRole("heading", { level: 1, name: "/pets" })).toBeDefined()
    expect(loadSpec).toHaveBeenCalledTimes(2)
  })

  it("sends try-it requests relative to where the spec came from", async () => {
    loadSpec.mockResolvedValue({ document: { ...document, servers: [{ url: "/v1" }] }, warnings: [] })
    render(<ApiReference spec="https://example.com/specs/openapi.json" />)
    fireEvent.click(await screen.findByRole("tab", { name: "Try it" }))
    fireEvent.click(screen.getByRole("button", { name: "Show curl" }))
    expect(screen.getByLabelText("curl").textContent).toContain("'https://example.com/v1/pets'")
  })

  it("renders Markdown without raw HTML or unsafe links", () => {
    const { container } = render(
      defaultRenderMarkdown('**bold** <img src=x onerror="alert(1)"> [x](javascript:alert(1))'),
    )
    expect(container.querySelector("strong")?.textContent).toBe("bold")
    expect(container.querySelector("img")).toBeNull()
    expect(container.querySelector("a")?.getAttribute("href")).toBe("")
  })

  it("shows the logo before the API title in both layouts", () => {
    const logo = <img src="logo.svg" alt="Acme" />
    const { rerender } = render(<ApiReference model={normalize(document)} logo={logo} />)
    expect(screen.getByRole("img", { name: "Acme" }).closest(".spectile-api-heading")).not.toBeNull()
    rerender(<ApiReference model={normalize(document)} layout="stacked" logo={logo} />)
    expect(screen.getByRole("img", { name: "Acme" }).closest(".spectile-stacked-brand")).not.toBeNull()
  })

  it("says so when there are no operations", () => {
    render(<ApiReference model={normalize(empty)} />)
    expect(screen.getByText("This API has no operations")).toBeDefined()
  })
})

describe("specUrl", () => {
  it("reads a URL from a URL or a path, never from document text", () => {
    const page = "https://docs.example.com/api/"
    expect(specUrl(new URL("https://example.com/a.json"))).toBe("https://example.com/a.json")
    expect(specUrl("/specs/a.yaml", page)).toBe("https://docs.example.com/specs/a.yaml")
    expect(specUrl("openapi: 3.1.0\ninfo: {}", page)).toBeUndefined()
    expect(specUrl('{"openapi":"3.1.0"}', page)).toBeUndefined()
    expect(specUrl({ openapi: "3.1.0" }, page)).toBeUndefined()
  })
})
