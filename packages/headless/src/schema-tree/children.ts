import { type SchemaNode, type SchemaRef, appendPointer } from "@spectile/core"

export type SchemaRowKind =
  "root" | "property" | "additionalProperties" | "items" | "allOf" | "oneOf" | "anyOf" | "not"

export type SchemaChild = {
  segments: (string | number)[]
  kind: SchemaRowKind
  name?: string
  index?: number
  required: boolean
  schema: SchemaRef
}

export type GetNode = (ref: SchemaRef) => SchemaNode

/** The selected variant of the oneOf/anyOf row with this id. */
export type SelectedVariant = (id: string) => number

export type VariantKind = "oneOf" | "anyOf"

export const COMPOSITIONS = ["allOf", "oneOf", "anyOf"] as const

export type Variants = { kind: VariantKind; options: SchemaRef[] }

/** The oneOf, else the anyOf, picked from with a select instead of listed as rows. */
export const variantsOf = (node: SchemaNode): Variants | undefined =>
  node.oneOf.length > 0
    ? { kind: "oneOf", options: node.oneOf }
    : node.anyOf.length > 0
      ? { kind: "anyOf", options: node.anyOf }
      : undefined

const single = (
  kind: "additionalProperties" | "items" | "not",
  schema: SchemaRef | boolean | undefined,
): SchemaChild[] =>
  typeof schema === "object" ? [{ segments: [kind], kind, required: false, schema }] : []

/** Every child schema except the variants, which `childEntries` replaces with the selected one's children. */
export const schemaChildren = (node: SchemaNode): SchemaChild[] => {
  const variants = variantsOf(node)?.kind
  return [
    ...node.properties.map(({ name, required, schema }): SchemaChild => ({
      segments: ["properties", name],
      kind: "property",
      name,
      required,
      schema,
    })),
    ...single("additionalProperties", node.additionalProperties),
    ...single("items", node.items),
    ...COMPOSITIONS.filter((kind) => kind !== variants).flatMap((kind) =>
      node[kind].map((schema, index): SchemaChild => ({
        segments: [kind, index],
        kind,
        index,
        required: false,
        schema,
      })),
    ),
    ...single("not", node.not),
  ]
}

/** `request` leaves out readOnly properties, `response` leaves out writeOnly ones. */
export type SchemaUsage = "request" | "response"

/** Whether a property is left out of the tree for this usage. */
export type IsHidden = (child: SchemaChild, node: SchemaNode) => boolean

export const hiddenIn =
  (usage: SchemaUsage | undefined): IsHidden =>
  (child, node) =>
    child.kind === "property" &&
    (usage === "request" ? node.readOnly : usage === "response" && node.writeOnly)

export type ChildEntry = { child: SchemaChild; id: string; node: SchemaNode }

/**
 * A node's own children, then the selected variant's. A variant that has variants itself comes as a
 * row of its own, to hold its select (and to stop where it leads back to an ancestor).
 */
export const childEntries = (
  getNode: GetNode,
  parent: SchemaNode,
  parentId: string,
  selected: SelectedVariant,
  hidden: IsHidden,
): ChildEntry[] => {
  const own = schemaChildren(parent)
    .map((child) => ({
      child,
      id: appendPointer(parentId, ...child.segments),
      node: getNode(child.schema),
    }))
    .filter(({ child, node }) => !hidden(child, node))
  const variants = variantsOf(parent)
  const index = selected(parentId)
  const option = variants?.options[index]
  if (!variants || !option) return own
  const variantId = appendPointer(parentId, variants.kind, index)
  const node = getNode(option)
  if (!variantsOf(node)) return [...own, ...childEntries(getNode, node, variantId, selected, hidden)]
  const child: SchemaChild = {
    segments: [variants.kind, index],
    kind: variants.kind,
    index,
    required: false,
    schema: option,
  }
  return [...own, { child, id: variantId, node }]
}

/** The names of the properties left out anywhere in the schema, every variant included. */
export const hiddenPropertyNames = (getNode: GetNode, root: SchemaNode, hidden: IsHidden) => {
  const names = new Set<string>()
  const seen = new Set<string>()
  const visit = (node: SchemaNode) => {
    if (seen.has(node.pointer)) return
    seen.add(node.pointer)
    for (const child of schemaChildren(node)) {
      const childNode = getNode(child.schema)
      if (hidden(child, childNode)) names.add(child.name ?? "")
      else visit(childNode)
    }
    for (const option of variantsOf(node)?.options ?? []) visit(getNode(option))
  }
  visit(root)
  return [...names]
}
