import type { Response } from "@spectile/core"
import { type DescriptionProps, Markdown } from "../../markdown"
import { Primitive, type PrimitiveProps, Text, type TextProps, mergeProps } from "../../primitive"
import { ResponseProvider, useResponse } from "./context"

export type RootProps = PrimitiveProps<"div"> & { response: Response }

export const Root = ({ response, ...props }: RootProps) => (
  <ResponseProvider value={response}>
    <Primitive as="div" {...mergeProps({ "data-status": response.status }, props)} />
  </ResponseProvider>
)

/** `200`, `4XX` or `default`. */
export const Status = (props: TextProps) => <Text value={useResponse().status} {...props} />

export const Description = (props: DescriptionProps) => (
  <Markdown source={useResponse().description} {...props} />
)
