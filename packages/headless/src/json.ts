import { createStore } from "./store"

/** `text` is a line of a body that isn't JSON. */
export type JsonTokenKind =
  "key" | "string" | "number" | "boolean" | "null" | "punctuation" | "ellipsis" | "text"

export type JsonToken = { kind: JsonTokenKind; text: string }

/** An object or array that can fold, opening on this line and closing on line `end`. */
export type JsonFold = { path: string; end: number }

export type JsonLine = { depth: number; tokens: JsonToken[]; fold?: JsonFold }

export type VisibleJsonLine = JsonLine & { folded: boolean }

const LEXEME =
  /\s+|"(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null|[{}[\]:,]/y

const lex = (text: string) => {
  const lexemes: string[] = []
  LEXEME.lastIndex = 0
  for (let match = LEXEME.exec(text); match; match = LEXEME.exec(text)) {
    if (match[0].trim()) lexemes.push(match[0])
  }
  return lexemes
}

const kindOf = (lexeme: string): JsonTokenKind => {
  if (lexeme.startsWith('"')) return "string"
  if (lexeme === "true" || lexeme === "false") return "boolean"
  if (lexeme === "null") return "null"
  return /^[{}[\]:,]$/.test(lexeme) ? "punctuation" : "number"
}

const CLOSING: Record<string, string> = { "{": "}", "[": "]" }

const escapeSegment = (segment: string) => segment.replaceAll("~", "~0").replaceAll("/", "~1")

type Frame = { path: string; array: boolean; index: number; line: number }

/**
 * The JSON laid out two spaces per level, one value per line, with each non-empty object and
 * array foldable by its JSON pointer path (`""` is the whole value). Undefined when it isn't JSON.
 * Numbers keep their text, so large ids stay exact.
 */
export const jsonLines = (text: string): JsonLine[] | undefined => {
  try {
    JSON.parse(text)
  } catch {
    return undefined
  }
  const lexemes = lex(text)
  const lines: JsonLine[] = []
  const stack: Frame[] = []
  let current: JsonLine = { depth: 0, tokens: [] }
  let key: string | undefined

  const endLine = (depth: number) => {
    if (current.tokens.length > 0) lines.push(current)
    current = { depth, tokens: [] }
  }
  const push = (kind: JsonTokenKind, text: string) => current.tokens.push({ kind, text })
  const nextPath = () => {
    const parent = stack.at(-1)
    if (!parent) return ""
    const segment = parent.array ? String(parent.index++) : escapeSegment(key ?? "")
    return `${parent.path}/${segment}`
  }

  for (let index = 0; index < lexemes.length; index++) {
    const lexeme = lexemes[index]!
    const next = lexemes[index + 1]
    if (lexeme === ",") {
      push("punctuation", ",")
      endLine(stack.length)
    } else if (lexeme === ":") {
      push("punctuation", ": ")
    } else if (lexeme in CLOSING && next === CLOSING[lexeme]) {
      nextPath()
      push("punctuation", lexeme + next)
      index++
    } else if (lexeme in CLOSING) {
      const path = nextPath()
      push("punctuation", lexeme)
      current.fold = { path, end: -1 }
      stack.push({ path, array: lexeme === "[", index: 0, line: lines.length })
      endLine(stack.length)
    } else if (lexeme === "}" || lexeme === "]") {
      const frame = stack.pop()
      endLine(stack.length)
      push("punctuation", lexeme)
      const opening = frame && lines[frame.line]?.fold
      if (opening) opening.end = lines.length
    } else if (next === ":" && lexeme.startsWith('"')) {
      key = JSON.parse(lexeme) as string
      push("key", lexeme)
    } else {
      nextPath()
      push(kindOf(lexeme), lexeme)
    }
  }
  endLine(0)
  return lines
}

/** `jsonLines`, or for other text one plain line per line. */
export const codeLines = (text: string): JsonLine[] =>
  jsonLines(text) ??
  text.split("\n").map((line) => ({ depth: 0, tokens: [{ kind: "text", text: line }] }))

/** Folded lines show `{ … }` or `[ … ]` and hide the lines up to their closing one. */
export const visibleJsonLines = (
  lines: readonly JsonLine[],
  folded: ReadonlySet<string>,
): VisibleJsonLine[] => {
  const visible: VisibleJsonLine[] = []
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!
    const closing = line.fold && folded.has(line.fold.path) ? lines[line.fold.end] : undefined
    if (!closing) {
      visible.push({ ...line, folded: false })
      continue
    }
    const tokens = [...line.tokens, { kind: "ellipsis" as const, text: " … " }, ...closing.tokens]
    visible.push({ ...line, tokens, folded: true })
    index = line.fold!.end
  }
  return visible
}

export const createJsonFolds = (initial: Iterable<string> = []) => {
  const store = createStore<{ folded: ReadonlySet<string> }>({ folded: new Set(initial) })

  const toggle = (path: string) =>
    store.setState(({ folded }) => {
      const next = new Set(folded)
      if (!next.delete(path)) next.add(path)
      return { folded: next }
    })

  const getToggleProps = (path: string) => {
    const folded = store.getSnapshot().folded.has(path)
    return {
      type: "button" as const,
      "aria-expanded": !folded,
      "data-state": folded ? "closed" : "open",
      onClick: () => toggle(path),
    }
  }

  return {
    getSnapshot: store.getSnapshot,
    subscribe: store.subscribe,
    toggle,
    getToggleProps,
  }
}

export type JsonFolds = ReturnType<typeof createJsonFolds>
