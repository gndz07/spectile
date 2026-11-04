import type { ExampleOptions, MediaType } from "@spectile/core"
import { Example, useExample } from "@spectile/react"
import { useState } from "react"
import { CodeBlock } from "./bits"
import { ChevronIcon } from "./icons"
import { Collapse } from "./presence"

const Selected = ({ label }: { label: string }) => {
  const { text } = useExample()
  return (
    <>
      <Example.Select className="spectile-select" data-size="small" aria-label="Example" />
      <Example.Description className="spectile-description spectile-prose" />
      {text !== undefined && <CodeBlock text={text} label={label} />}
    </>
  )
}

/** The media type's example in a code block, with a select for several named examples. */
export const ExampleView = ({
  media,
  usage,
  label,
}: { media: MediaType; label: string } & ExampleOptions) => (
  <Example.Root media={media} usage={usage} className="spectile-example">
    <Selected label={label} />
  </Example.Root>
)

/** A collapsed "Example" that opens to the example. */
export const CollapsibleExample = ({ media, usage }: { media: MediaType } & ExampleOptions) => {
  const [open, setOpen] = useState(false)
  return (
    <div className="spectile-collapsible" data-state={open ? "open" : "closed"}>
      <button
        type="button"
        className="spectile-disclosure"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <ChevronIcon />
        Example
      </button>
      <Collapse open={open}>
        <ExampleView media={media} usage={usage} label="example" />
      </Collapse>
    </div>
  )
}
