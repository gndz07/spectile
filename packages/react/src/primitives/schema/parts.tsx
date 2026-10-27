import type { SchemaRef } from "@spectile/core"
import {
  type SchemaRow,
  type SchemaTreeOptions,
  schemaConstraintsLabel,
  schemaDefaultLabel,
  schemaRowLabel,
  schemaTypeLabel,
} from "@spectile/headless"
import { type CSSProperties, Fragment, type ReactNode } from "react"
import { useFollowFocus } from "../../focus"
import { useSchemaTree } from "../../hooks"
import { type DescriptionProps, Markdown } from "../../markdown"
import { useSpectile } from "../../provider"
import {
  Primitive,
  type PrimitiveProps,
  RequiredText,
  Text,
  type TextProps,
  mergeProps,
  useComposedRefs,
} from "../../primitive"
import { SchemaProvider, SchemaRowProvider, useSchema, useSchemaRow } from "./context"

export type RootProps = SchemaTreeOptions & { schema: SchemaRef; children?: ReactNode }

export const Root = ({ schema, children, ...options }: RootProps) => (
  <SchemaProvider value={useSchemaTree(schema, options)}>{children}</SchemaProvider>
)

export type TreeProps = PrimitiveProps<"div">

export const Tree = (props: TreeProps) => (
  <Primitive as="div" {...mergeProps(useSchema().getTreeProps(), props)} />
)

export type RowsProps = { children: (row: SchemaRow) => ReactNode }

export const Rows = ({ children }: RowsProps) =>
  useSchema().rows.map((row) => <Fragment key={row.id}>{children(row)}</Fragment>)

export type RowProps = PrimitiveProps<"div"> & { row: SchemaRow }

export const Row = ({ row, ref, ...props }: RowProps) => {
  const schema = useSchema()
  const focusRef = useFollowFocus<HTMLDivElement>(schema.focusedId === row.id)
  const composedRef = useComposedRefs(ref, focusRef)
  const style = { "--spectile-depth": row.depth } as CSSProperties
  return (
    <SchemaRowProvider value={row}>
      <Primitive
        as="div"
        {...mergeProps({ ...schema.getRowProps(row), style }, props)}
        ref={composedRef}
      />
    </SchemaRowProvider>
  )
}

export const Name = (props: TextProps) => <Text value={schemaRowLabel(useSchemaRow())} {...props} />

export const Type = (props: TextProps) => (
  <Text value={schemaTypeLabel(useSchemaRow().node, useSpectile().model)} {...props} />
)

export const Description = (props: DescriptionProps) => (
  <Markdown source={useSchemaRow().node.description} {...props} />
)

export const Required = (props: TextProps) => (
  <RequiredText required={useSchemaRow().required} {...props} />
)

/** The default value after the type, e.g. `= true`. */
export const Default = (props: TextProps) => (
  <Text value={schemaDefaultLabel(useSchemaRow().node)} {...props} />
)

/** Allowed values and limits, e.g. `≥ 1 · ≤ 100`. */
export const Constraints = (props: TextProps) => (
  <Text value={schemaConstraintsLabel(useSchemaRow().node)} {...props} />
)

export type VariantSelectProps = PrimitiveProps<"select">

/** Picks the oneOf/anyOf variant whose fields show under the row. Nothing on other rows. */
export const VariantSelect = ({ children, ...props }: VariantSelectProps) => {
  const schema = useSchema()
  const row = useSchemaRow()
  if (!row.variants) return null
  const ours = { "data-kind": row.variants.kind, ...schema.getVariantSelectProps(row) }
  return (
    <Primitive as="select" {...mergeProps(ours, props)}>
      {children ??
        row.variants.labels.map((label, index) => (
          <option key={index} value={index}>
            {label}
          </option>
        ))}
    </Primitive>
  )
}

export type LinkProps = PrimitiveProps<"button">

/**
 * On a recursive row that no longer expands, a button that moves focus to the ancestor row with
 * the same schema. Its text defaults to that row's label.
 */
export const Link = ({ children, ...props }: LinkProps) => {
  const { rows, root, focus } = useSchema()
  const { recursiveTarget, expandable } = useSchemaRow()
  if (recursiveTarget === undefined || expandable) return null
  const target = rows.find((candidate) => candidate.id === recursiveTarget) ?? rows[0]
  const ours = {
    type: "button" as const,
    "data-target": recursiveTarget,
    onClick: () => target && focus(target.id),
  }
  return (
    <Primitive as="button" {...mergeProps(ours, props)}>
      {children ??
        (target?.id === recursiveTarget ? schemaRowLabel(target) : (root.refName ?? "root"))}
    </Primitive>
  )
}

export type ExpandToggleProps = PrimitiveProps<"button">

/** Expands every row, or collapses them all once they're all open. Defaults to "Expand all" / "Collapse all". */
export const ExpandToggle = ({ children, ...props }: ExpandToggleProps) => {
  const { allExpanded, expandAll, collapseAll } = useSchema()
  const ours = {
    type: "button" as const,
    "data-state": allExpanded ? "open" : "closed",
    onClick: allExpanded ? collapseAll : expandAll,
  }
  return (
    <Primitive as="button" {...mergeProps(ours, props)}>
      {children ?? (allExpanded ? "Collapse all" : "Expand all")}
    </Primitive>
  )
}

export const Indicator = (props: TextProps) => {
  const { expandable, expanded } = useSchemaRow()
  return (
    <Text
      value={expandable ? "" : undefined}
      aria-hidden
      data-state={expanded ? "open" : "closed"}
      {...props}
    />
  )
}
