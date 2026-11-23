import { createStore, select } from "./store"

/** `text` is a line of a body that isn't JSON. */
export type JsonTokenKind =
  "key" | "string" | "number" | "boolean" | "null" | "punctuation" | "ellipsis" | "text"

export type JsonToken = { kind: JsonTokenKind; text: string }

/** An object or array that can fold, opening on this line and closing on line `end`, holding `size` entries. */
export type JsonFold = { path: string; end: number; size: number }

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

/** `size` counts the entries so far, and names the next one in an array. */
type Frame = { path: string; array: boolean; size: number; line: number }

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
    const segment = parent.array ? String(parent.size) : escapeSegment(key ?? "")
    parent.size++
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
      current.fold = { path, end: -1, size: 0 }
      stack.push({ path, array: lexeme === "[", size: 0, line: lines.length })
      endLine(stack.length)
    } else if (lexeme === "}" || lexeme === "]") {
      const frame = stack.pop()
      endLine(stack.length)
      push("punctuation", lexeme)
      const opening = frame && lines[frame.line]?.fold
      if (opening) {
        opening.end = lines.length
        opening.size = frame.size
      }
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

const holdsContainers = (lines: readonly JsonLine[], index: number, fold: JsonFold) =>
  lines.slice(index + 1, fold.end).some((line) => line.fold && line.depth === lines[index]!.depth + 1)

/**
 * The paths to start folded so the shape reads at a glance: objects opening at `depth` or deeper,
 * and arrays there that hold objects or arrays. Arrays of plain values stay open.
 */
export const nestedFolds = (lines: readonly JsonLine[], depth: number) =>
  lines.flatMap((line, index) => {
    const { fold, tokens } = line
    if (!fold || line.depth < depth) return []
    const isObject = tokens.at(-1)?.text === "{"
    return isObject || holdsContainers(lines, index, fold) ? [fold.path] : []
  })

const flipped = (paths: ReadonlySet<string>, path: string): ReadonlySet<string> => {
  const next = new Set(paths)
  if (!next.delete(path)) next.add(path)
  return next
}

const sameMembers = (a: ReadonlySet<string>, b: ReadonlySet<string>) =>
  a.size === b.size && [...a].every((member) => b.has(member))

/** The paths folded by default, flipped wherever the reader toggled one. */
export const foldedPaths = (defaults: ReadonlySet<string>, toggled: ReadonlySet<string>) =>
  [...toggled].reduce(flipped, defaults)

/**
 * `initial` is what starts folded. `setDefaults` replaces it, for a new body, and keeps what the
 * reader toggled, by path.
 */
export const createJsonFolds = (initial: Iterable<string> = []) => {
  const store = createStore<{ defaults: ReadonlySet<string>; toggled: ReadonlySet<string> }>({
    defaults: new Set(initial),
    toggled: new Set(),
  })
  const folds = select(store, ({ defaults, toggled }) => ({
    folded: foldedPaths(defaults, toggled),
  }))

  const toggle = (path: string) =>
    store.setState((state) => ({ ...state, toggled: flipped(state.toggled, path) }))

  const setDefaults = (paths: Iterable<string>) =>
    store.setState((state) => {
      const defaults = new Set(paths)
      return sameMembers(defaults, state.defaults) ? state : { ...state, defaults }
    })

  const getToggleProps = (path: string) => {
    const folded = folds.getSnapshot().folded.has(path)
    return {
      type: "button" as const,
      "aria-expanded": !folded,
      "data-state": folded ? "closed" : "open",
      onClick: () => toggle(path),
    }
  }

  return {
    getSnapshot: folds.getSnapshot,
    subscribe: folds.subscribe,
    toggle,
    setDefaults,
    getToggleProps,
  }
}

export type JsonFolds = ReturnType<typeof createJsonFolds>
