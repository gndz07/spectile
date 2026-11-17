import type { SchemaNode, SchemaRef } from "@spectile/core"
import type { SchemaRow as Row, SchemaUsage } from "@spectile/headless"
import { Schema, useSchema, useSpectile } from "@spectile/react"
import { type ReactNode, useMemo, useState } from "react"
import { Tag, TypeWithValues } from "./bits"
import { ChevronIcon, ChevronsUpDownIcon } from "./icons"
import { typeLabel } from "./labels"
import { Collapse } from "./presence"

const VARIANT_WORDS = { oneOf: "one of", anyOf: "any of" }

/** Rows standing for an array's items or a map's values read as a sentence, not a name. */
const SENTENCES: Partial<Record<Row["kind"], { each: string; all: string }>> = {
  items: { each: "Each item is", all: "Items are" },
  additionalProperties: { each: "Each value is", all: "Values are" },
}

const isObject = ({ types, properties }: SchemaNode) =>
  types.includes("object") || (types.length === 0 && properties.length > 0)

const NOT_EXPANDED = "(same shape as this one, not expanded again)"

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

const RowTags = ({ row }: { row: Row }) => (
  <>
    {row.required && <Tag tone="required">required</Tag>}
    {row.node.deprecated && <Tag tone="deprecated">deprecated</Tag>}
    {row.node.readOnly && <Tag tone="neutral">read-only</Tag>}
    {row.node.writeOnly && <Tag tone="neutral">write-only</Tag>}
  </>
)

/** A recursive row's type links back to where that type is expanded. */
const TypeName = ({ row, label }: { row: Row; label: string }) =>
  row.recursive ? <Schema.Link className="spectile-type-link">{label}</Schema.Link> : label

const Variants = ({ row, lead }: { row: Row; lead?: string }) => {
  const words = VARIANT_WORDS[row.variants!.kind]
  return (
    <>
      <span className="spectile-type">
        {lead ? `${lead} ${words}` : row.kind === "root" ? capitalize(words) : words}
      </span>
      <Schema.VariantSelect className="spectile-select" data-size="small" aria-label="Variant" />
    </>
  )
}

/** "name · string · required", "Items are User objects", or "One of [Cat]". */
const RowLine = ({ row }: { row: Row }) => {
  const label = typeLabel(useSpectile().model, row.node)
  const sentence = SENTENCES[row.kind]
  const type = <TypeName row={row} label={label} />
  return (
    <>
      {!sentence && row.kind !== "root" && (
        <span className="spectile-name">
          <Schema.Name />
        </span>
      )}
      {row.variants ? (
        <Variants row={row} lead={sentence?.each} />
      ) : (
        <>
          <TypeWithValues
            type={
              sentence ? (
                <>
                  {`${sentence.all} `}
                  {type}
                  {isObject(row.node) ? " objects" : " values"}
                </>
              ) : (
                type
              )
            }
            node={row.node}
          />
          <Schema.Default className="spectile-type" />
          {row.recursive && <span className="spectile-type">{NOT_EXPANDED}</span>}
        </>
      )}
      <RowTags row={row} />
    </>
  )
}

const SchemaRow = ({ row }: { row: Row }) => (
  <Schema.Row row={row} className="spectile-schema-row">
    <div className="spectile-row-line">
      <Schema.Indicator className="spectile-indicator">
        <ChevronIcon />
      </Schema.Indicator>
      <RowLine row={row} />
    </div>
    <Schema.Description className="spectile-description spectile-prose" />
    <Schema.Constraints className="spectile-constraints" />
  </Schema.Row>
)

const RootType = () => {
  const { model } = useSpectile()
  const { root } = useSchema()
  return (
    <p className="spectile-row-line">
      <TypeWithValues type={typeLabel(model, root)} node={root} />
    </p>
  )
}

const ExpandToggle = () => {
  const { rows, allExpanded } = useSchema()
  if (!rows.some((row) => row.expandable)) return null
  return (
    <Schema.ExpandToggle className="spectile-quiet-button">
      <ChevronsUpDownIcon />
      {allExpanded ? "Collapse all" : "Expand all"}
    </Schema.ExpandToggle>
  )
}

const HIDDEN_NOTES: Record<SchemaUsage, (name: ReactNode) => ReactNode> = {
  request: (name) => (
    <>Read-only fields like {name} are set by the server, so they aren't listed here.</>
  ),
  response: (name) => (
    <>Write-only fields like {name} are only ever sent, so they aren't listed here.</>
  ),
}

/** Says which fields `usage` left out, naming the first. */
const HiddenNote = ({ usage }: { usage?: SchemaUsage }) => {
  const [first] = useSchema().hiddenNames
  if (!usage || first === undefined) return null
  return <p className="spectile-note spectile-prose">{HIDDEN_NOTES[usage](<code>{first}</code>)}</p>
}

type Children = ReadonlyMap<string | undefined, Row[]>

const childrenByParent = (rows: Row[]): Children => {
  const tree = new Map<string | undefined, Row[]>()
  for (const row of rows) {
    const siblings = tree.get(row.parentId)
    if (siblings) siblings.push(row)
    else tree.set(row.parentId, [row])
  }
  return tree
}

/** A row's children, kept while they shrink away after it collapses. */
const Subtree = ({ row, tree }: { row: Row; tree: Children }) => {
  const children = tree.get(row.id)
  const [shown, setShown] = useState(children)
  if (children && children !== shown) setShown(children)
  return (
    <Collapse open={row.expanded}>
      <div className="spectile-schema-children" data-parent={row.kind}>
        <Branches rows={shown ?? []} tree={tree} />
      </div>
    </Collapse>
  )
}

/** Each row with its subtree, so a divider can go below the whole field. */
const Branches = ({ rows, tree }: { rows: Row[]; tree: Children }) =>
  rows.map((row) => (
    <div key={row.id} className="spectile-schema-branch">
      <SchemaRow row={row} />
      {row.expandable && <Subtree row={row} tree={tree} />}
    </div>
  ))

/** Rows nest by parent, so each expanded row's children can grow and shrink together. */
const Tree = ({ label }: { label: string }) => {
  const { rows } = useSchema()
  const tree = useMemo(() => childrenByParent(rows), [rows])
  if (rows.length === 0) return <RootType />
  return (
    <Schema.Tree className="spectile-schema" aria-label={label}>
      <Branches rows={tree.get(undefined) ?? []} tree={tree} />
    </Schema.Tree>
  )
}

/**
 * A schema tree, its first level open, with `header` beside the Expand all button and `intro`
 * under it. `usage` leaves out read-only (request) or write-only (response) fields, and says so.
 */
export const SchemaView = ({
  schema,
  label,
  header,
  intro,
  usage,
}: {
  schema: SchemaRef
  label: string
  header?: ReactNode
  intro?: ReactNode
  usage?: SchemaUsage
}) => (
  <Schema.Root schema={schema} defaultExpandedDepth={1} usage={usage} recursion="link">
    <div className="spectile-schema-header">
      {header}
      <ExpandToggle />
    </div>
    {intro}
    <HiddenNote usage={usage} />
    <Tree label={label} />
  </Schema.Root>
)
