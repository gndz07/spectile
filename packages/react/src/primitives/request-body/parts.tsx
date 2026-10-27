import { useTryIt } from "../../hooks"
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

export type MediaSelectProps = PrimitiveProps<"select">

/** Picks the content type when the body has several; nothing otherwise. */
export const MediaSelect = ({ children, ...props }: MediaSelectProps) => {
  const { content } = useRequestBody()
  const tryIt = useTryIt(useOperationContext().id)
  if (content.length < 2) return null
  return (
    <Primitive as="select" {...mergeProps(tryIt.getMediaTypeSelectProps(), props)}>
      {children ??
        content.map(({ mediaType }) => (
          <option key={mediaType} value={mediaType}>
            {mediaType}
          </option>
        ))}
    </Primitive>
  )
}
