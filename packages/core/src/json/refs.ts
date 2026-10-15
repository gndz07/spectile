import type { Issue, IssueCode } from "../model"
import { getAtPointer } from "./pointer"
import { type JsonObject, isObject } from "./read"

/** `via` holds the `$ref` objects that were followed, outermost first. */
export type Resolution = { pointer: string; value: unknown; via: JsonObject[]; issue?: Issue }

export const issue = (code: IssueCode, message: string, pointer: string): Issue => ({
  code,
  message,
  pointer,
})

export const refOf = (value: unknown) =>
  isObject(value) && typeof value.$ref === "string" ? value.$ref : undefined

/** `stopAt` keeps a `$ref` object as the result instead of following it. */
export const resolvePointer = (
  document: unknown,
  pointer: string,
  stopAt?: (reference: JsonObject) => boolean,
): Resolution => {
  const visited = new Set<string>()
  const via: JsonObject[] = []
  let current = pointer
  while (!visited.has(current)) {
    visited.add(current)
    if (!current.startsWith("#")) {
      return {
        pointer: current,
        value: undefined,
        via,
        issue: issue("external-ref", `External reference ${current} was not bundled`, pointer),
      }
    }
    const value = getAtPointer(document, current)
    if (value === undefined) {
      return {
        pointer: current,
        value,
        via,
        issue: issue("unresolved-ref", `Cannot resolve ${current}`, pointer),
      }
    }
    const ref = refOf(value)
    if (ref === undefined || !isObject(value) || stopAt?.(value)) {
      return { pointer: current, value, via }
    }
    via.push(value)
    current = ref
  }
  return {
    pointer: current,
    value: undefined,
    via,
    issue: issue("ref-cycle", `References loop back to ${current}`, pointer),
  }
}

/** Keys written next to a `$ref` override the target's; the outermost reference wins. */
export const fromReferences = <T extends object>(
  via: readonly JsonObject[],
  read: (reference: JsonObject) => T,
): T => Object.assign({}, ...[...via].reverse().map(read))
