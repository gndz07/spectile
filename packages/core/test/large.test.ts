import { existsSync, readdirSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { normalize } from "../src"
import { loadSpec } from "../src/loader"

const directory = new URL("./fixtures/large/", import.meta.url)
const files = existsSync(directory) ? readdirSync(directory) : []

describe.skipIf(files.length === 0)("large specs", () => {
  it.each(files)("loads and normalizes %s", { timeout: 120_000 }, async (file) => {
    const started = performance.now()
    const { document } = await loadSpec(readFileSync(new URL(file, directory), "utf8"), {
      validate: false,
    })
    const model = normalize(document)
    const seconds = ((performance.now() - started) / 1000).toFixed(2)
    console.info(`${file}: ${model.operations.length} operations in ${seconds}s`)
    expect(() => JSON.stringify(model)).not.toThrow()
  })
})
