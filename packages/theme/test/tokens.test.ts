// @vitest-environment node
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const css = readFileSync(new URL("../css/tokens.css", import.meta.url), "utf8")

type Theme = "light" | "dark"

const colors = Object.fromEntries(
  [...css.matchAll(/--spectile-color-([\w-]+):\s*(?:light-dark\((#\w+),\s*(#\w+)\)|(#\w+))/g)].map(
    ([, name, light, dark, both]) => [name!, { light: light ?? both!, dark: dark ?? both! }],
  ),
)

const channel = (hex: string, offset: number) => {
  const value = parseInt(hex.slice(offset, offset + 2), 16) / 255
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

const luminance = (hex: string) =>
  0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5)

const contrast = (a: string, b: string) => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (high! + 0.05) / (low! + 0.05)
}

const SURFACES = ["bg", "surface-raised", "surface-sunken"]

const PAIRED = [
  "accent-subtle",
  ...["get", "post", "put", "patch", "delete", "other"].map((method) => `method-${method}`),
  ...["success", "redirect", "client-error", "server-error", "warning"].map(
    (status) => `status-${status}`,
  ),
  "deprecated",
  "required",
]

const CODE = ["text", "key", "string", "number", "muted", "missing"].map((name) => `code-${name}`)

/** [foreground, background, minimum ratio] */
const PAIRS: [string, string, number][] = [
  ...["text", "text-secondary", "link", "status-warning", "status-server-error"].flatMap((text) =>
    SURFACES.map((surface): [string, string, number] => [text, surface, 4.5]),
  ),
  ["text-on-accent", "accent", 4.5],
  ["text-on-accent", "accent-hover", 4.5],
  ...PAIRED.map((name): [string, string, number] => [name, `${name}-bg`, 4.5]),
  ...CODE.map((name): [string, string, number] => [name, "code-bg", 4.5]),
  ...["border-control-hover", "focus-ring", "accent"].flatMap((edge) =>
    SURFACES.map((surface): [string, string, number] => [edge, surface, 3]),
  ),
  ...SURFACES.map((surface): [string, string, number] => ["border-control", surface, 2]),
]

describe("tokens.css", () => {
  it("defines the 37 color tokens, each pair with a background", () => {
    const names = Object.keys(colors)
    expect(names.filter((name) => !name.endsWith("-bg") || name === "code-bg")).toHaveLength(37)
    for (const name of PAIRED) expect(colors).toHaveProperty(`${name}-bg`)
  })

  it.each(["light", "dark"] as Theme[])("meets WCAG AA contrast in the %s theme", (theme) => {
    const failures = PAIRS.flatMap(([foreground, background, minimum]) => {
      const ratio = contrast(colors[foreground]![theme], colors[background]![theme])
      return ratio < minimum ? [`${foreground} on ${background}: ${ratio.toFixed(2)}`] : []
    })
    expect(failures).toEqual([])
  })
})
