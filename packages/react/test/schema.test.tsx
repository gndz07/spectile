import { act, fireEvent, render, screen } from "@testing-library/react"
import type { KeyboardEvent } from "react"
import { describe, expect, it } from "vitest"
import { model, schemaRef } from "../../headless/test/fixture"
import { Schema, SpectileProvider } from "../src"

const UserSchema = () => (
  <SpectileProvider model={model}>
    <Schema.Root schema={schemaRef("User")}>
      <Schema.Tree aria-label="User">
        <Schema.Rows>
          {(row) => (
            <Schema.Row row={row}>
              <Schema.Indicator>▸</Schema.Indicator>
              <Schema.Name /> <Schema.Type /> <Schema.Required />
            </Schema.Row>
          )}
        </Schema.Rows>
      </Schema.Tree>
    </Schema.Root>
  </SpectileProvider>
)

const rows = () => screen.getAllByRole("treeitem")
const row = (label: string) => screen.getByRole("treeitem", { name: new RegExp(`^${label} `) })
const press = (key: string) => fireEvent.keyDown(document.activeElement ?? document.body, { key })
const focus = (element: HTMLElement) => act(() => element.focus())

describe("Schema primitives", () => {
  it("renders an accessible tree of rows", () => {
    render(<UserSchema />)
    expect(screen.getByRole("tree", { name: "User" })).toBeDefined()
    expect(rows().map((element) => element.textContent)).toEqual([
      "name string required",
      "▸friends User[] ",
      "▸profile Profile ",
    ])
    const friends = row("friends")
    expect(friends.getAttribute("aria-expanded")).toBe("false")
    expect(friends.getAttribute("aria-level")).toBe("1")
    expect(friends.style.getPropertyValue("--spectile-depth")).toBe("0")
    expect(row("name").getAttribute("aria-expanded")).toBeNull()
  })

  it("expands rows on click", () => {
    render(<UserSchema />)
    fireEvent.click(row("friends"))
    expect(rows()).toHaveLength(4)
    expect(row("friends").dataset.state).toBe("open")
    expect(row("User").getAttribute("aria-level")).toBe("2")
  })

  it("moves DOM focus with the keyboard", () => {
    render(<UserSchema />)
    expect(rows().map((element) => element.tabIndex)).toEqual([0, -1, -1])
    focus(row("name"))
    press("ArrowDown")
    expect(document.activeElement).toBe(row("friends"))
    press("ArrowRight")
    press("ArrowRight")
    expect(document.activeElement).toBe(row("User"))
    press("ArrowLeft")
    expect(document.activeElement).toBe(row("friends"))
    press("End")
    expect(document.activeElement).toBe(row("profile"))
  })

  it("supports asChild and lets user handlers prevent the default behavior", () => {
    const preventSpace = (event: KeyboardEvent) => {
      if (event.key === " ") event.preventDefault()
    }
    render(
      <SpectileProvider model={model}>
        <Schema.Root schema={schemaRef("User")}>
          <Schema.Tree asChild>
            <ul className="tree">
              <Schema.Rows>
                {(row) => (
                  <Schema.Row row={row} asChild onKeyDown={preventSpace}>
                    <li className="row">
                      <Schema.Name />
                    </li>
                  </Schema.Row>
                )}
              </Schema.Rows>
            </ul>
          </Schema.Tree>
        </Schema.Root>
      </SpectileProvider>,
    )
    const tree = screen.getByRole("tree")
    expect(tree.tagName).toBe("UL")
    expect(rows().every((element) => element.tagName === "LI" && element.className === "row")).toBe(
      true,
    )
    const profile = screen.getByRole("treeitem", { name: "profile" })
    focus(profile)
    press(" ")
    expect(profile.getAttribute("aria-expanded")).toBe("false")
    press("Enter")
    expect(profile.getAttribute("aria-expanded")).toBe("true")
  })

  it("throws a clear error outside its root", () => {
    expect(() => render(<Schema.Name />)).toThrow("Missing <Schema.Row>")
  })
})
