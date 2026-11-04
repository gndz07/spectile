export type Layout = "sidebar" | "stacked"

export type TryItPreference = "panel" | "drawer" | "inline" | false

export type ResolvedLayout = {
  layout: Layout
  /** `drawer`: a top bar whose "Operations" button opens the navigation as a left drawer. */
  navigation: "sidebar" | "drawer" | "none"
  /** `sheet`: one bottom sheet with Request and Response tabs. */
  tryIt: "panel" | "drawer" | "inline" | "sheet" | false
}

/** Container widths in px; the same numbers are written into the CSS container queries. */
export const BREAKPOINTS = { wide: 1280, medium: 960, narrow: 600 } as const

/**
 * What renders at a container width. `layout` and `tryIt` are preferences: the panel needs a wide
 * container, narrower containers use drawers, and phones get one bottom sheet.
 */
export const resolveLayout = ({
  layout,
  tryIt,
  width,
}: {
  layout: Layout
  tryIt: TryItPreference
  width: number
}): ResolvedLayout => {
  const navigation =
    layout === "stacked" ? "none" : width >= BREAKPOINTS.medium ? "sidebar" : "drawer"
  if (tryIt === false) return { layout, navigation, tryIt }
  if (width < BREAKPOINTS.narrow) return { layout, navigation, tryIt: "sheet" }
  if (width < BREAKPOINTS.medium) return { layout, navigation, tryIt: "drawer" }
  return { layout, navigation, tryIt: tryIt === "panel" && width < BREAKPOINTS.wide ? "drawer" : tryIt }
}
