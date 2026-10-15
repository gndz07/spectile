import { type ReactNode, createContext, useContext } from "react";
import { type PrimitiveProps, Text } from "./primitive";

export type RenderMarkdown = (markdown: string) => ReactNode;

export const plainText: RenderMarkdown = (markdown) => markdown;

export const MarkdownContext = createContext<RenderMarkdown>(plainText);

export type MarkdownProps = PrimitiveProps<"div"> & { source?: string };

export type DescriptionProps = Omit<MarkdownProps, "source">;

/** Renders `source` with the provider's `renderMarkdown`, or as plain text without one. */
export const Markdown = ({ source, ...props }: MarkdownProps) => {
  const render = useContext(MarkdownContext);
  return <Text as="div" value={source ? render(source) : undefined} {...props} />;
};
