import { type DescriptionProps, Markdown } from "../../markdown"
import { Text, type TextProps } from "../../primitive"
import { useSpectile } from "../../provider"

const useInfo = () => useSpectile().model.info

export const Title = (props: TextProps) => <Text value={useInfo().title} {...props} />

export const Version = (props: TextProps) => <Text value={useInfo().version} {...props} />

export const Summary = (props: TextProps) => <Text value={useInfo().summary} {...props} />

export const Description = (props: DescriptionProps) => (
  <Markdown source={useInfo().description} {...props} />
)
