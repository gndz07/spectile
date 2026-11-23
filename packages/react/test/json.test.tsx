import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { Copy, Json } from "../src"

const Viewer = ({ text, foldDepth }: { text: string; foldDepth?: number }) => (
  <Json.Root text={text} foldDepth={foldDepth} data-testid="json">
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

  it("folds every new body from foldDepth and keeps what the reader opened", () => {
    const { rerender } = render(<Viewer text="" foldDepth={1} />)
    rerender(<Viewer text={'{"owner":{"id":1},"ok":true}'} foldDepth={1} />)
    expect(lineTexts()).toEqual(["{", '"owner": { … },', '"ok": true', "}"])
    fireEvent.click(screen.getAllByRole("button", { name: "Fold" })[1]!)
    expect(lineTexts()).toEqual(["{", '"owner": {', '"id": 1', "},", '"ok": true', "}"])
    rerender(<Viewer text={'{"owner":{"id":2},"pet":{"id":3}}'} foldDepth={1} />)
    expect(lineTexts()).toEqual(["{", '"owner": {', '"id": 2', "},", '"pet": { … }', "}"])
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

  it("marks itself failed where there is no Clipboard API", async () => {
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true })
    render(<Copy text="curl x">Copy</Copy>)
    const button = screen.getByRole("button", { name: "Copy" })
    await act(async () => fireEvent.click(button))
    expect(button.dataset.state).toBe("failed")
  })
})
