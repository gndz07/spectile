import { withoutUndefined } from "../json/read"
import type { SchemaNode, SchemaProperty, SchemaRef, SchemaType, SpecModel } from "../model"
import { getSchema } from "./get"

const accepts = (types: readonly SchemaType[], type: SchemaType) =>
  types.includes(type) || (type === "integer" && types.includes("number"))

/** Undefined when no value can match both lists. An empty list matches anything. */
const sharedTypes = (a: SchemaType[], b: SchemaType[]): SchemaType[] | undefined => {
  if (a.length === 0) return b
  if (b.length === 0) return a
  const shared = [...new Set([...a, ...b])].filter((type) => accepts(a, type) && accepts(b, type))
  return shared.length > 0 ? shared : undefined
}

const fits = (a: SchemaNode, b: SchemaNode) =>
  sharedTypes(a.types, b.types) !== undefined &&
  !(a.oneOf.length > 0 && b.oneOf.length > 0) &&
  !(a.anyOf.length > 0 && b.anyOf.length > 0)

const mergeProperties = (earlier: SchemaProperty[], later: SchemaProperty[]) => [
  ...new Map([...earlier, ...later].map((property) => [property.name, property])).values(),
]

/** `later` wins wherever both set a value. */
const combine = (earlier: SchemaNode, later: SchemaNode): SchemaNode => {
  const required = [...new Set([...earlier.required, ...later.required])]
  return {
    ...earlier,
    ...withoutUndefined(later),
    types: sharedTypes(earlier.types, later.types) ?? later.types,
    deprecated: earlier.deprecated || later.deprecated,
    readOnly: earlier.readOnly || later.readOnly,
    writeOnly: earlier.writeOnly || later.writeOnly,
    examples: later.examples.length > 0 ? later.examples : earlier.examples,
    constraints: { ...earlier.constraints, ...withoutUndefined(later.constraints) },
    required,
    properties: mergeProperties(earlier.properties, later.properties).map((property) => ({
      ...property,
      required: required.includes(property.name),
    })),
    allOf: [...earlier.allOf, ...later.allOf],
    oneOf: [...earlier.oneOf, ...later.oneOf],
    anyOf: [...earlier.anyOf, ...later.anyOf],
    refName: later.refName,
    circular: later.circular,
    issue: later.issue,
  }
}

/**
 * Folds `allOf` parts into the schema: properties and required names combine, and later parts win
 * for everything else, the schema's own keywords last. Parts that can't merge (no shared type, a
 * second `oneOf`/`anyOf`, or a cycle) stay in `allOf`.
 */
export const mergeAllOf = (
  model: SpecModel,
  node: SchemaNode,
  ancestors: ReadonlySet<string> = new Set(),
): SchemaNode => {
  if (node.allOf.length === 0) return node
  const inner = new Set([...ancestors, node.pointer])
  const own: SchemaNode = { ...node, allOf: [] }
  const { parts, kept } = node.allOf.reduce<{
    parts: SchemaNode[]
    kept: SchemaRef[]
    shape: SchemaNode
  }>(
    (state, ref) => {
      const part = inner.has(ref.pointer)
        ? undefined
        : mergeAllOf(model, getSchema(model, ref), inner)
      return part && fits(state.shape, part)
        ? { ...state, parts: [...state.parts, part], shape: combine(part, state.shape) }
        : { ...state, kept: [...state.kept, ref] }
    },
    { parts: [], kept: [], shape: own },
  )
  const merged = [...parts, own].reduce(combine)
  return { ...merged, allOf: [...merged.allOf, ...kept] }
}

export const getMergedSchema = (model: SpecModel, ref: string | SchemaRef) =>
  mergeAllOf(model, getSchema(model, ref))
