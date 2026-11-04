import { describe, expect, it } from "vitest"
import { resolveLayout } from "../src"

describe("resolveLayout", () => {
  it("keeps the preference when the container is wide enough", () => {
    expect(resolveLayout({ layout: "sidebar", tryIt: "panel", width: 1440 })).toEqual({
      layout: "sidebar",
      navigation: "sidebar",
      tryIt: "panel",
    })
    expect(resolveLayout({ layout: "sidebar", tryIt: "inline", width: 1000 }).tryIt).toBe("inline")
  })

  it("turns the panel into a drawer below 1280px, in either layout", () => {
    expect(resolveLayout({ layout: "sidebar", tryIt: "panel", width: 1279 }).tryIt).toBe("drawer")
    expect(resolveLayout({ layout: "stacked", tryIt: "panel", width: 1279 }).tryIt).toBe("drawer")
    expect(resolveLayout({ layout: "stacked", tryIt: "panel", width: 1440 })).toEqual({
      layout: "stacked",
      navigation: "none",
      tryIt: "panel",
    })
  })

  it("moves the sidebar into a drawer below 960px", () => {
    expect(resolveLayout({ layout: "sidebar", tryIt: "inline", width: 959 })).toEqual({
      layout: "sidebar",
      navigation: "drawer",
      tryIt: "drawer",
    })
  })

  it("uses one bottom sheet below 600px, and never shows try-it when it is off", () => {
    for (const tryIt of ["panel", "drawer", "inline"] as const) {
      expect(resolveLayout({ layout: "sidebar", tryIt, width: 599 }).tryIt).toBe("sheet")
    }
    expect(resolveLayout({ layout: "sidebar", tryIt: false, width: 320 }).tryIt).toBe(false)
  })
})
