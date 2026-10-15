import { type Header, type Parameter, getSchema } from "@spectile/core"
import { schemaTypeLabel } from "@spectile/headless"
import { type DescriptionProps, Markdown } from "../../markdown"
import {
  Primitive,
  type PrimitiveProps,
  RequiredText,
  Text,
  type TextProps,
  mergeProps,
} from "../../primitive"
import { useSpectile } from "../../provider"
import { ParameterProvider, useParameter } from "./context"

export type RootProps = PrimitiveProps<"div"> & { parameter: Parameter | Header }

const locationOf = (parameter: Parameter | Header) => ("in" in parameter ? parameter.in : undefined)

/** A parameter, or a response header. */
export const Root = ({ parameter, ...props }: RootProps) => {
  const ours = {
    "data-location": locationOf(parameter),
    "data-required": parameter.required ? "" : undefined,
    "data-deprecated": parameter.deprecated ? "" : undefined,
  }
  return (
    <ParameterProvider value={parameter}>
      <Primitive as="div" {...mergeProps(ours, props)} />
    </ParameterProvider>
  )
}

export const Name = (props: TextProps) => <Text value={useParameter().name} {...props} />

/** `query`, `header`, `path` or `cookie`. Nothing for a response header. */
export const Location = (props: TextProps) => <Text value={locationOf(useParameter())} {...props} />

export const Type = (props: TextProps) => {
  const { model } = useSpectile()
  const { schema, content } = useParameter()
  const ref = schema ?? content[0]?.schema
  return <Text value={ref && schemaTypeLabel(getSchema(model, ref), model)} {...props} />
}

export const Required = (props: TextProps) => (
  <RequiredText required={useParameter().required} {...props} />
)

export const Description = (props: DescriptionProps) => (
  <Markdown source={useParameter().description} {...props} />
)
