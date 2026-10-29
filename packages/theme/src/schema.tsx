import type { SchemaRef } from "@spectile/core"
import { type SchemaRow as Row, schemaTypeLabel } from "@spectile/headless"
import { Schema, useSchema, useSpectile } from "@spectile/react"
import type { ReactNode } from "react"
import { Tag } from "./bits"
import { ChevronIcon } from "./icons"

const VARIANT_LABEL = { oneOf: "one of", anyOf: "any of" }

const RowTags = ({ row }: { row: Row }) => (
  <>
    {row.required && <Tag tone="required">required</Tag>}
    {row.node.deprecated && <Tag tone="deprecated">deprecated</Tag>}
    {row.node.readOnly && <Tag tone="neutral">read-only</Tag>}
    {row.node.writeOnly && <Tag tone="neutral">write-only</Tag>}
    {row.recursive && row.expandable && <Tag tone="recursive">↻ recursive</Tag>}
    <Schema.Link className="spectile-tag" data-tone="recursive" />
  </>
)

const SchemaRow = ({ row }: { row: Row }) => (
  <Schema.Row row={row} className="spectile-schema-row">
    <div className="spectile-row-line">
      <Schema.Indicator className="spectile-indicator">
        <ChevronIcon />
      </Schema.Indicator>
      <span className="spectile-name">{row.kind === "root" ? "body" : <Schema.Name />}</span>
      {row.variants ? (
        <span className="spectile-variant">
          {VARIANT_LABEL[row.variants.kind]}
          <Schema.VariantSelect className="spectile-select" aria-label="Variant" />
        </span>
      ) : (
        <span className="spectile-type">
          <Schema.Type /> <Schema.Default />
        </span>
      )}
      <RowTags row={row} />
    </div>
    <Schema.Description className="spectile-description spectile-prose" />
    <Schema.Constraints className="spectile-constraints" />
  </Schema.Row>
)

const RootType = () => {
  const { model } = useSpectile()
  return <p className="spectile-type">{schemaTypeLabel(useSchema().root, model)}</p>
}

const ExpandToggle = () => {
  const { rows } = useSchema()
  if (!rows.some((row) => row.expandable)) return null
  return <Schema.ExpandToggle className="spectile-button" data-size="small" />
}

const Tree = ({ label }: { label: string }) => {
  if (useSchema().rows.length === 0) return <RootType />
  return (
    <Schema.Tree className="spectile-schema" aria-label={label}>
      <Schema.Rows>{(row) => <SchemaRow row={row} />}</Schema.Rows>
    </Schema.Tree>
  )
}

/** A schema tree, its first level open, with `header` beside the Expand all button. */
export const SchemaView = ({
  schema,
  label,
  header,
}: {
  schema: SchemaRef
  label: string
  header?: ReactNode
}) => (
  <Schema.Root schema={schema} defaultExpandedDepth={1}>
    <div className="spectile-schema-header">
      {header}
      <ExpandToggle />
    </div>
    <Tree label={label} />
  </Schema.Root>
)
