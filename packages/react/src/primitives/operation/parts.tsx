import type { NormalizedOperation } from "@spectile/core"
import { useOperation } from "../../hooks"
import { type DescriptionProps, Markdown } from "../../markdown"
import { Primitive, type PrimitiveProps, Text, type TextProps, mergeProps } from "../../primitive"
import { OperationProvider, useOperationContext } from "./context"

export type RootProps = PrimitiveProps<"section"> & { operation?: NormalizedOperation }

/** Renders the given operation, or the active one. Renders nothing when there is neither. */
export const Root = ({ operation, ...props }: RootProps) => {
  const active = useOperation()
  const current = operation ?? active
  if (!current) return null
  const ours = {
    "data-method": current.method,
    "data-deprecated": current.deprecated ? "" : undefined,
  }
  return (
    <OperationProvider value={current}>
      <Primitive as="section" {...mergeProps(ours, props)} />
    </OperationProvider>
  )
}

export const Method = (props: TextProps) => {
  const { method } = useOperationContext()
  return <Text value={method.toUpperCase()} data-method={method} {...props} />
}

export const Path = (props: TextProps) => <Text value={useOperationContext().path} {...props} />

export const Summary = (props: TextProps) => (
  <Text value={useOperationContext().summary} {...props} />
)

export const Description = (props: DescriptionProps) => (
  <Markdown source={useOperationContext().description} {...props} />
)
