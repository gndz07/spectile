import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { Copy, Json } from "../src"

const Viewer = ({ text }: { text: string }) => (
  <Json.Root text={text} data-testid="json">
    <Json.Lines>
      {(line) => (
        <Json.Line line={line}>
          <Json.Toggle aria-label="Fold" />
          <Json.Tokens />
        </Json.Line>
      )}
    </Json.Lines>
  </Json.Root>
)

const lineTexts = () =>
  [...screen.getByTestId("json").children].map((line) => line.textContent)

describe("Json", () => {
  it("renders lines of tokens that fold", () => {
    render(<Viewer text={'{"tags":["a"],"ok":true}'} />)
    expect(lineTexts()).toEqual(["{", '"tags": [', '"a"', "],", '"ok": true', "}"])
    const line = screen.getByTestId("json").children[1] as HTMLElement
    expect(line.style.getPropertyValue("--spectile-depth")).toBe("1")
    expect(line.querySelector('[data-kind="key"]')?.textContent).toBe('"tags"')

    const [, tags] = screen.getAllByRole("button", { name: "Fold" })
    fireEvent.click(tags!)
    expect(lineTexts()).toEqual(["{", '"tags": [ … ],', '"ok": true', "}"])
    expect(tags!.getAttribute("aria-expanded")).toBe("false")
  })

  it("shows other text as plain lines", () => {
    render(<Viewer text={"a\n  b"} />)
    expect(lineTexts()).toEqual(["a", "  b"])
    expect(screen.queryByRole("button")).toBeNull()
  })
})

describe("Copy", () => {
  it("copies its text and marks itself copied for a moment", async () => {
    vi.useFakeTimers()
    const writeText = vi.fn(async () => {})
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
    render(<Copy text="curl x">Copy</Copy>)
    const button = screen.getByRole("button", { name: "Copy" })
    await act(async () => fireEvent.click(button))
    expect(writeText).toHaveBeenCalledWith("curl x")
    expect(button.dataset.state).toBe("copied")
    act(() => vi.advanceTimersByTime(2000))
    expect(button.dataset.state).toBe("idle")
    vi.useRealTimers()
  })
})
