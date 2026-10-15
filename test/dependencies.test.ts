import { readFileSync } from "node:fs"
import { expect, it } from "vitest"

const UI_FRAMEWORKS = ["react", "react-dom", "vue", "svelte", "solid-js", "preact"]
const FRAMEWORK_FREE_PACKAGES = ["core", "headless"]

it.each(FRAMEWORK_FREE_PACKAGES)("%s does not depend on a UI framework", (name) => {
  const manifestUrl = new URL(`../packages/${name}/package.json`, import.meta.url)
  const manifest = JSON.parse(readFileSync(manifestUrl, "utf8"))
  const dependencies = Object.keys({
    ...manifest.dependencies,
    ...manifest.peerDependencies,
    ...manifest.devDependencies,
  })
  expect(dependencies.filter((dependency) => UI_FRAMEWORKS.includes(dependency))).toEqual([])
})
