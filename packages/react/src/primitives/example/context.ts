import type { Example } from "@spectile/core"
import { createRequiredContext } from "../../context"

export type ExampleState = {
  examples: Example[]
  selected: number
  select: (index: number) => void
  example: Example
  /** The selected example as text: strings as they are, other values as indented JSON. */
  text?: string
}

export const [ExampleProvider, useExample] = createRequiredContext<ExampleState>("Example.Root")
