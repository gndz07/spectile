import { type SchemaNode, type SchemaRef, appendPointer } from "@spectile/core"

export type SchemaRowKind =
  "property" | "additionalProperties" | "items" | "allOf" | "oneOf" | "anyOf" | "not"

export type SchemaChild = {
  segments: (string | number)[]
  kind: SchemaRowKind
  name?: string
  index?: number
  required: boolean
  schema: SchemaRef
}

export type GetNode = (ref: SchemaRef) => SchemaNode

export const COMPOSITIONS = ["allOf", "oneOf", "anyOf"] as const

const single = (
  kind: "additionalProperties" | "items" | "not",
  schema: SchemaRef | boolean | undefined,
): SchemaChild[] =>
  typeof schema === "object" ? [{ segments: [kind], kind, required: false, schema }] : []

export const schemaChildren = (node: SchemaNode): SchemaChild[] => [
  ...node.properties.map(({ name, required, schema }): SchemaChild => ({
    segments: ["properties", name],
    kind: "property",
    name,
    required,
    schema,
  })),
  ...single("additionalProperties", node.additionalProperties),
  ...single("items", node.items),
  ...COMPOSITIONS.flatMap((kind) =>
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

export const isExpandable = (node: SchemaNode) => schemaChildren(node).length > 0

export const childEntries = (getNode: GetNode, parent: SchemaNode, parentId: string) =>
  schemaChildren(parent).map((child) => ({
    child,
    id: appendPointer(parentId, ...child.segments),
    node: getNode(child.schema),
  }))
