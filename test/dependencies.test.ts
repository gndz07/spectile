import { readFileSync, readdirSync } from "node:fs"
import { expect, it } from "vitest"

const UI_FRAMEWORKS = ["react", "react-dom", "vue", "svelte", "solid-js", "preact"]
const FRAMEWORK_FREE_PACKAGES = ["core", "headless"]
const PACKAGES = [...FRAMEWORK_FREE_PACKAGES, "react", "theme"]
const MARKDOWN_PARSERS = ["react-markdown", "marked", "markdown-it", "micromark", "remark", "unified"]

const packageUrl = (name: string, path: string) =>
  new URL(`../packages/${name}/${path}`, import.meta.url)

const manifestOf = (name: string) =>
  JSON.parse(readFileSync(packageUrl(name, "package.json"), "utf8"))

const dependenciesOf = (name: string) => {
  const manifest = manifestOf(name)
  return Object.keys({
    ...manifest.dependencies,
    ...manifest.peerDependencies,
    ...manifest.devDependencies,
  })
}

const IMPORT_SOURCE = /(?:\bfrom|^import)\s+["']([^"'.][^"']*)["']/gm

const packageNameOf = (source: string) =>
  source.split("/", source.startsWith("@") ? 2 : 1).join("/")

/** The packages a package's source imports, which tsup bundles unless they ship as dependencies. */
const importedPackagesOf = (name: string) => {
  const sourceUrl = packageUrl(name, "src/")
  const sources = readdirSync(sourceUrl, { recursive: true, encoding: "utf8" })
    .filter((file) => /\.tsx?$/.test(file))
    .flatMap((file) =>
      [...readFileSync(new URL(file.replaceAll("\\", "/"), sourceUrl), "utf8").matchAll(IMPORT_SOURCE)]
        .map(([, source = ""]) => source),
    )
  return [...new Set(sources.filter((source) => !source.startsWith("node:")).map(packageNameOf))]
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

it.each(PACKAGES)("%s ships every package its source imports", (name) => {
  const manifest = manifestOf(name)
  const shipped = Object.keys({ ...manifest.dependencies, ...manifest.peerDependencies })
  expect(importedPackagesOf(name).filter((imported) => !shipped.includes(imported))).toEqual([])
})
