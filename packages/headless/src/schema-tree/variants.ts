import { type SchemaNode, type SpecModel, getMergedSchema } from "@spectile/core"
import { type GetNode, variantsOf } from "./children"

const discriminatorValue = (getNode: GetNode, parent: SchemaNode, option: SchemaNode) => {
  const { discriminator } = parent
  if (!discriminator) return undefined
  const mapped = Object.entries(discriminator.mapping).find(
    ([, ref]) => ref.pointer === option.pointer,
  )?.[0]
  if (mapped !== undefined) return mapped
  const property = option.properties.find(({ name }) => name === discriminator.propertyName)
  const value = property && getNode(property.schema).const
  return typeof value === "string" ? value : undefined
}

/** The schema's title, then its discriminator value, then its schema name, then "Option n". */
export const labelVariant = (getNode: GetNode, parent: SchemaNode, index: number) => {
  const ref = variantsOf(parent)?.options[index]
  const option = ref && getNode(ref)
  return (
    (option &&
      (option.title ?? discriminatorValue(getNode, parent, option) ?? option.refName)) ??
    `Option ${index + 1}`
  )
}

export const variantLabel = (model: SpecModel, parent: SchemaNode, index: number) =>
  labelVariant((ref) => getMergedSchema(model, ref), parent, index)
