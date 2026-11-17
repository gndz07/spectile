import {
  type VisibleJsonLine,
  codeLines,
  createJsonFolds,
  nestedFolds,
  visibleJsonLines,
} from "@spectile/headless"
import { type CSSProperties, Fragment, type ReactNode, useMemo } from "react"
import { useStore } from "../../hooks"
import { Primitive, type PrimitiveProps, mergeProps } from "../../primitive"
import { JsonLineProvider, JsonProvider, useJson, useJsonLine } from "./context"

export type RootProps = PrimitiveProps<"div"> & {
  /** A response or example body. Text that isn't JSON shows as plain lines. */
  text: string
  /** Objects (and arrays of objects or arrays) this deep start folded; 1 folds everything inside the top level. */
  foldDepth?: number
}

/** Folds are kept by path, so they survive a new body of the same shape. */
export const Root = ({ text, foldDepth, ...props }: RootProps) => {
  const lines = useMemo(() => codeLines(text), [text])
  const folds = useMemo(
    () => createJsonFolds(foldDepth === undefined ? [] : nestedFolds(lines, foldDepth)),
    // Only the first body's folds start closed; later ones keep what the reader chose.
    [],
  )
  const { folded } = useStore(folds)
  const visible = useMemo(() => visibleJsonLines(lines, folded), [lines, folded])
  return (
    <JsonProvider value={{ ...folds, lines: visible }}>
      <Primitive as="div" {...props} />
    </JsonProvider>
  )
}

export type LinesProps = { children: (line: VisibleJsonLine) => ReactNode }

export const Lines = ({ children }: LinesProps) =>
  useJson().lines.map((line, index) => <Fragment key={index}>{children(line)}</Fragment>)

export type LineProps = PrimitiveProps<"div"> & { line: VisibleJsonLine }

/** Sets `--spectile-depth` for indenting. */
export const Line = ({ line, ...props }: LineProps) => {
  const ours = {
    "data-depth": line.depth,
    "data-state": line.fold ? (line.folded ? "closed" : "open") : undefined,
    style: { "--spectile-depth": line.depth } as CSSProperties,
  }
  return (
    <JsonLineProvider value={line}>
      <Primitive as="div" {...mergeProps(ours, props)} />
    </JsonLineProvider>
  )
}

export type ToggleProps = PrimitiveProps<"button">

/** Folds or unfolds the object or array opening on this line; nothing on other lines. */
export const Toggle = (props: ToggleProps) => {
  const { getToggleProps } = useJson()
  const { fold } = useJsonLine()
  if (!fold) return null
  return <Primitive as="button" {...mergeProps(getToggleProps(fold.path), props)} />
}

/** The line's tokens as `<span data-kind>`s: key, string, number, boolean, null, punctuation, ellipsis or text. */
export const Tokens = () =>
  useJsonLine().tokens.map((token, index) => (
    <span key={index} data-kind={token.kind}>
      {token.text}
    </span>
  ))
