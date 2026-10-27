import { readFileSync } from "node:fs"
import { expect, it } from "vitest"

const UI_FRAMEWORKS = ["react", "react-dom", "vue", "svelte", "solid-js", "preact"]
const FRAMEWORK_FREE_PACKAGES = ["core", "headless"]
const MARKDOWN_PARSERS = ["react-markdown", "marked", "markdown-it", "micromark", "remark", "unified"]

const dependenciesOf = (name: string) => {
  const manifestUrl = new URL(`../packages/${name}/package.json`, import.meta.url)
  const manifest = JSON.parse(readFileSync(manifestUrl, "utf8"))
  return Object.keys({
    ...manifest.dependencies,
    ...manifest.peerDependencies,
    ...manifest.devDependencies,
  })
}

it.each(FRAMEWORK_FREE_PACKAGES)("%s does not depend on a UI framework", (name) => {
  expect(dependenciesOf(name).filter((dependency) => UI_FRAMEWORKS.includes(dependency))).toEqual(
    [],
  )
})

it("react leaves Markdown parsing to renderMarkdown", () => {
  expect(
    dependenciesOf("react").filter((dependency) => MARKDOWN_PARSERS.includes(dependency)),
  ).toEqual([])
})
