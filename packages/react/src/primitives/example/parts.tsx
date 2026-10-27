import { type Example, type ExampleOptions, type MediaType, exampleFromSchema } from "@spectile/core"
import { useMemo, useState } from "react"
import { type DescriptionProps, Markdown } from "../../markdown"
import { useSpectile } from "../../provider"
import { Primitive, type PrimitiveProps, Text, type TextProps, mergeProps } from "../../primitive"
import { ExampleProvider, useExample } from "./context"

const exampleText = ({ value, externalValue }: Example) => {
  if (value === undefined) return externalValue
  return typeof value === "string" ? value : JSON.stringify(value, null, 2)
}

export type RootProps = PrimitiveProps<"div"> &
  ExampleOptions & {
    /** Its named examples, or one built from its schema when it has none. */
    media: MediaType
  }

/** Renders nothing when the media type has neither examples nor a schema. */
export const Root = ({ media, usage, ...props }: RootProps) => {
  const { model } = useSpectile()
  const examples = useMemo<Example[]>(() => {
    if (media.examples.length > 0 || !media.schema) return media.examples
    return [{ name: "example", value: exampleFromSchema(model, media.schema, { usage }) }]
  }, [model, media, usage])
  const [chosen, select] = useState(0)
  const selected = chosen < examples.length ? chosen : 0
  const example = examples[selected]
  if (!example) return null
  const state = { examples, selected, select, example, text: exampleText(example) }
  return (
    <ExampleProvider value={state}>
      <Primitive as="div" {...mergeProps({ "data-name": example.name }, props)} />
    </ExampleProvider>
  )
}

export type SelectProps = PrimitiveProps<"select">

/** Picks one of several named examples; nothing when there is only one. Options show summaries, else names. */
export const Select = ({ children, ...props }: SelectProps) => {
  const { examples, selected, select } = useExample()
  if (examples.length < 2) return null
  const ours = {
    value: String(selected),
    onChange: (event: { currentTarget: { value: string } }) =>
      select(Number(event.currentTarget.value)),
  }
  return (
    <Primitive as="select" {...mergeProps(ours, props)}>
      {children ??
        examples.map((example, index) => (
          <option key={example.name} value={index}>
            {example.summary ?? example.name}
          </option>
        ))}
    </Primitive>
  )
}

export const Summary = (props: TextProps) => <Text value={useExample().example.summary} {...props} />

export const Description = (props: DescriptionProps) => (
  <Markdown source={useExample().example.description} {...props} />
)

/** The selected example's value; for an `externalValue`, its URL. */
export const Value = (props: TextProps) => <Text value={useExample().text} {...props} />
