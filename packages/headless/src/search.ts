export type TextRange = { start: number; end: number }

export const searchTerms = (query: string) => query.toLowerCase().split(/\s+/).filter(Boolean)

const occurrences = (text: string, term: string): TextRange[] => {
  const ranges: TextRange[] = []
  for (let start = text.indexOf(term); start !== -1; start = text.indexOf(term, start + 1)) {
    ranges.push({ start, end: start + term.length })
  }
  return ranges
}

/** Where the query's terms appear in the text, case-insensitively, sorted with overlaps joined. */
export const matchRanges = (text: string, query: string): TextRange[] => {
  const lower = text.toLowerCase()
  const sorted = searchTerms(query)
    .flatMap((term) => occurrences(lower, term))
    .sort((a, b) => a.start - b.start)
  return sorted.reduce<TextRange[]>((joined, range) => {
    const last = joined.at(-1)
    if (last && range.start <= last.end) {
      return [...joined.slice(0, -1), { start: last.start, end: Math.max(last.end, range.end) }]
    }
    return [...joined, range]
  }, [])
}
