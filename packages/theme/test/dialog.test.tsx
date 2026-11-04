import { act, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { Dialog } from "../src/dialog"
import { Collapse } from "../src/presence"

const view = (open: boolean) => (
  <Dialog open={open} onClose={() => {}} label="Panel" className="spectile-drawer">
    <p>Contents</p>
  </Dialog>
)

afterEach(() => {
  Reflect.deleteProperty(HTMLElement.prototype, "getAnimations")
})

describe("Dialog", () => {
  it("keeps its contents until the closing transition finishes", async () => {
    let finish = () => {}
    const finished = new Promise<void>((resolve) => {
      finish = resolve
    })
    Object.defineProperty(HTMLElement.prototype, "getAnimations", {
      configurable: true,
      value: vi.fn(() => [{ finished }]),
    })
    const { rerender } = render(view(true))
    rerender(view(false))
    expect(screen.getByText("Contents")).toBeDefined()
    await act(async () => {
      finish()
      await finished
    })
    expect(screen.queryByText("Contents")).toBeNull()
  })

  it("drops its contents at once when nothing animates", () => {
    const { rerender } = render(view(true))
    rerender(view(false))
    expect(screen.queryByText("Contents")).toBeNull()
  })
})

describe("Collapse", () => {
  it("marks itself closed and keeps its contents while it shrinks", () => {
    Object.defineProperty(HTMLElement.prototype, "getAnimations", {
      configurable: true,
      value: () => [{ finished: new Promise(() => {}) }],
    })
    const collapse = (open: boolean) => (
      <Collapse open={open}>
        <p>Body</p>
      </Collapse>
    )
    const { rerender, container } = render(collapse(true))
    rerender(collapse(false))
    expect(container.querySelector(".spectile-collapse")?.getAttribute("data-state")).toBe("closed")
    expect(screen.getByText("Body")).toBeDefined()
  })
})
