import { type Issue, type SpecModel, normalize } from "@spectile/core"
import type { LoadInput } from "@spectile/core/loader"
import { useEffect, useState } from "react"

export type SpecInput = LoadInput

type Ready = { status: "ready"; model: SpecModel; warnings: Issue[] }

type Failed = { status: "failed"; error: string }

export type SpecState = { status: "loading" } | Ready | (Failed & { retry: () => void })

const load = async (spec: SpecInput): Promise<Ready | Failed> => {
  try {
    const { loadSpec } = await import("@spectile/core/loader")
    const { document, warnings } = await loadSpec(spec)
    const model = normalize(document)
    return { status: "ready", model, warnings: [...warnings, ...model.warnings] }
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? error.message : String(error) }
  }
}

const keyOf = (spec: SpecInput) => (spec instanceof URL ? spec.href : spec)

/** Where the spec was fetched from, resolved against `base`; undefined for document text or objects. */
export const specUrl = (spec: SpecInput, base?: string) => {
  if (spec instanceof URL) return spec.href
  if (typeof spec !== "string" || /\s|^[{[]/.test(spec.trim())) return undefined
  try {
    return new URL(spec.trim(), base).href
  } catch {
    return undefined
  }
}

/** Loads and normalizes the spec, again when it changes or on `retry`. Pass objects with a stable identity. */
export const useSpec = (spec: SpecInput): SpecState => {
  const [attempt, setAttempt] = useState(0)
  const [loaded, setLoaded] = useState<{ key: unknown; attempt: number; result: Ready | Failed }>()
  const key = keyOf(spec)

  useEffect(() => {
    let current = true
    void load(key).then((result) => {
      if (current) setLoaded({ key, attempt, result })
    })
    return () => {
      current = false
    }
  }, [key, attempt])

  if (!loaded || loaded.key !== key || loaded.attempt !== attempt) return { status: "loading" }
  const { result } = loaded
  return result.status === "ready"
    ? result
    : { ...result, retry: () => setAttempt((count) => count + 1) }
}
