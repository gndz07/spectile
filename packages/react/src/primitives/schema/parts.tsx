import type { SchemaRef } from "@spectile/core";
import {
  type SchemaRow,
  type SchemaTreeOptions,
  schemaRowLabel,
  schemaTypeLabel,
} from "@spectile/headless";
import { type CSSProperties, Fragment, type ReactNode, useEffect, useRef } from "react";
import { useSchemaTree } from "../../hooks";
import { type DescriptionProps, Markdown } from "../../markdown";
import {
  Primitive,
  type PrimitiveProps,
  Text,
  type TextProps,
  mergeProps,
  useComposedRefs,
} from "../../primitive";
import { SchemaProvider, SchemaRowProvider, useSchema, useSchemaRow } from "./context";

export type RootProps = SchemaTreeOptions & { schema: SchemaRef; children?: ReactNode };

export const Root = ({ schema, children, ...options }: RootProps) => (
  <SchemaProvider value={useSchemaTree(schema, options)}>{children}</SchemaProvider>
);

export type TreeProps = PrimitiveProps<"div">;

export const Tree = (props: TreeProps) => (
  <Primitive as="div" {...mergeProps(useSchema().getTreeProps(), props)} />
);

export type RowsProps = { children: (row: SchemaRow) => ReactNode };

export const Rows = ({ children }: RowsProps) =>
  useSchema().rows.map((row) => <Fragment key={row.id}>{children(row)}</Fragment>);

/** Moves DOM focus to the row the tree says is focused, unless focus is somewhere outside the tree. */
const useFollowFocus = <T extends HTMLElement>(focused: boolean) => {
  const ref = useRef<T>(null);
  useEffect(() => {
    const element = ref.current;
    if (!focused || !element) return;
    const { activeElement, body } = element.ownerDocument;
    if (activeElement === element) return;
    const focusInTree =
      !activeElement ||
      activeElement === body ||
      element.closest('[role="tree"]')?.contains(activeElement);
    if (focusInTree) element.focus();
  }, [focused]);
  return ref;
};

export type RowProps = PrimitiveProps<"div"> & { row: SchemaRow };

export const Row = ({ row, ref, ...props }: RowProps) => {
  const schema = useSchema();
  const focusRef = useFollowFocus<HTMLDivElement>(schema.focusedId === row.id);
  const composedRef = useComposedRefs(ref, focusRef);
  const style = { "--spectile-depth": row.depth } as CSSProperties;
  return (
    <SchemaRowProvider value={row}>
      <Primitive
        as="div"
        {...mergeProps({ ...schema.getRowProps(row), style }, props)}
        ref={composedRef}
      />
    </SchemaRowProvider>
  );
};

export const Name = (props: TextProps) => <Text value={schemaRowLabel(useSchemaRow())} {...props} />;

export const Type = (props: TextProps) => (
  <Text value={schemaTypeLabel(useSchemaRow().node)} {...props} />
);

export const Description = (props: DescriptionProps) => (
  <Markdown source={useSchemaRow().node.description} {...props} />
);

export const Required = (props: TextProps) => (
  <Text value={useSchemaRow().required ? "required" : undefined} {...props} />
);

export const Indicator = (props: TextProps) => {
  const { expandable, expanded } = useSchemaRow();
  return (
    <Text
      value={expandable ? "" : undefined}
      aria-hidden
      data-state={expanded ? "open" : "closed"}
      {...props}
    />
  );
};
