import type { ExampleOptions, MediaType } from "@spectile/core"
import { Example, useExample } from "@spectile/react"
import { Code, CodeBlock } from "./bits"
import { Disclosure } from "./presence"

/** A response preview folds nested objects to `{ … }`, so its shape reads at a glance. */
const foldDepthFor =(usage: ExampleOptions["usage"]) => (usage === "response" ? 1 : undefined)

/**
 * Inside `Example.Root`: a select for several named examples, the description and the code.
 * Without `bare`, the code has its own copy button.
 */
export const SelectedExample = ({
  label,
  usage,
  bare = false,
}: { label: string; bare?: boolean } & ExampleOptions) => {
  const { text } = useExample()
  const Block = bare ? Code : CodeBlock
  return (
    <>
      <Example.Select className="spectile-select" data-size="small" aria-label="Example" />
      <Example.Description className="spectile-description spectile-prose" />
      {text !== undefined && <Block text={text} label={label} foldDepth={foldDepthFor(usage)} />}
    </>
  )
}

/** A collapsed "Example" that opens to the example. */
export const CollapsibleExample = ({ media, usage }: { media: MediaType } & ExampleOptions) => (
  <Disclosure label="Example">
    <Example.Root media={media} usage={usage} className="spectile-example">
      <SelectedExample label="example" usage={usage} />
    </Example.Root>
  </Disclosure>
)
