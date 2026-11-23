import { describe, expect, it, vi } from "vitest"
import {
  type JsonLine,
  createJsonFolds,
  jsonLines,
  nestedFolds,
  visibleJsonLines,
} from "../src"

const text = (lines: readonly JsonLine[]) =>
  lines.map(({ depth, tokens }) => "  ".repeat(depth) + tokens.map((token) => token.text).join(""))

const BODY = '{"id":12345678901234567890,"tags":["a",{}],"owner":{"a/b":null},"ok":true}'

describe("jsonLines", () => {
  it("lays out JSON one value per line, keeping number text", () => {
    expect(text(jsonLines(BODY)!)).toEqual([
      "{",
      '  "id": 12345678901234567890,',
      '  "tags": [',
      '    "a",',
      "    {}",
      "  ],",
      '  "owner": {',
      '    "a/b": null',
      "  },",
      '  "ok": true',
      "}",
    ])
  })

  it("tags tokens by kind and marks folds with their path and closing line", () => {
    const lines = jsonLines(BODY)!
    expect(lines[1]!.tokens).toEqual([
      { kind: "key", text: '"id"' },
      { kind: "punctuation", text: ": " },
      { kind: "number", text: "12345678901234567890" },
      { kind: "punctuation", text: "," },
    ])
    expect(lines.flatMap(({ fold }) => (fold ? [fold] : []))).toEqual([
      { path: "", end: 10, size: 4 },
      { path: "/tags", end: 5, size: 2 },
      { path: "/owner", end: 8, size: 1 },
    ])
  })

  it("is undefined for text that isn't JSON", () => {
    expect(jsonLines("<html>")).toBeUndefined()
    expect(text(jsonLines('"hi"')!)).toEqual(['"hi"'])
  })
})

describe("visibleJsonLines", () => {
  it("collapses folded objects and arrays to one line", () => {
    const lines = jsonLines(BODY)!
    expect(text(visibleJsonLines(lines, new Set(["/tags"])))).toContain('  "tags": [ … ],')
    expect(text(visibleJsonLines(lines, new Set([""])))).toEqual(["{ … }"])
  })
})

describe("nestedFolds", () => {
  it("lists objects and arrays of containers at a depth or deeper, leaving plain arrays open", () => {
    expect(nestedFolds(jsonLines(BODY)!, 1)).toEqual(["/owner"])
    expect(nestedFolds(jsonLines(BODY)!, 0)).toEqual(["", "/owner"])
    const pets = jsonLines('{"pets":[{"a":1}],"tags":["x"]}')!
    expect(nestedFolds(pets, 1)).toEqual(["/pets", "/pets/0"])
  })
})

describe("createJsonFolds", () => {
  it("toggles folds by path", () => {
    const folds = createJsonFolds()
    const listener = vi.fn()
    folds.subscribe(listener)
    expect(folds.getToggleProps("/tags")).toMatchObject({ "aria-expanded": true })
    folds.getToggleProps("/tags").onClick()
    expect(folds.getSnapshot().folded.has("/tags")).toBe(true)
    expect(folds.getToggleProps("/tags")).toMatchObject({ "data-state": "closed" })
    folds.toggle("/tags")
    expect(folds.getSnapshot().folded.size).toBe(0)
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it("takes new defaults and keeps what was toggled", () => {
    const folds = createJsonFolds(["/owner"])
    const listener = vi.fn()
    folds.subscribe(listener)
    folds.toggle("/owner")
    folds.toggle("/tags")
    expect([...folds.getSnapshot().folded]).toEqual(["/tags"])
    folds.setDefaults(["/owner", "/pets"])
    expect([...folds.getSnapshot().folded].sort()).toEqual(["/pets", "/tags"])
    folds.setDefaults(["/pets", "/owner"])
    expect(listener).toHaveBeenCalledTimes(3)
  })
})
