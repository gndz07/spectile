import type { ExternalDocs } from "@spectile/core"
import { type DescriptionProps, Markdown } from "../../markdown"
import { Primitive, type PrimitiveProps, Text, mergeProps } from "../../primitive"
import { ExternalDocsProvider, useExternalDocs } from "./context"

export type RootProps = PrimitiveProps<"div"> & { externalDocs?: ExternalDocs }

/** Pass the `externalDocs` of the model, a tag, an operation or a schema. Renders nothing without one. */
export const Root = ({ externalDocs, ...props }: RootProps) =>
  externalDocs ? (
    <ExternalDocsProvider value={externalDocs}>
      <Primitive as="div" {...props} />
    </ExternalDocsProvider>
  ) : null

/** An `<a>` to the docs, showing the URL unless given children. */
export const Link = (props: PrimitiveProps<"a">) => {
  const { url } = useExternalDocs()
  return <Text as="a" value={url} {...mergeProps({ href: url }, props)} />
}

export const Description = (props: DescriptionProps) => (
  <Markdown source={useExternalDocs().description} {...props} />
)
