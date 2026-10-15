import { type DescriptionProps, Markdown } from "../../markdown"
import {
  Primitive,
  type PrimitiveProps,
  RequiredText,
  type TextProps,
  mergeProps,
} from "../../primitive"
import { useOperationContext } from "../operation/context"
import { RequestBodyProvider, useRequestBody } from "./context"

export type RootProps = PrimitiveProps<"div">

/** The operation's request body. Renders nothing when it takes none. */
export const Root = (props: RootProps) => {
  const { requestBody } = useOperationContext()
  if (!requestBody) return null
  const ours = { "data-required": requestBody.required ? "" : undefined }
  return (
    <RequestBodyProvider value={requestBody}>
      <Primitive as="div" {...mergeProps(ours, props)} />
    </RequestBodyProvider>
  )
}

export const Required = (props: TextProps) => (
  <RequiredText required={useRequestBody().required} {...props} />
)

export const Description = (props: DescriptionProps) => (
  <Markdown source={useRequestBody().description} {...props} />
)
