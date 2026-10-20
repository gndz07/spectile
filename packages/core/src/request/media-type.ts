export const isJsonMediaType = (mediaType = "") => /[/+]json\b/i.test(mediaType)

export const isUrlEncoded = (mediaType = "") =>
  /^application\/x-www-form-urlencoded\b/i.test(mediaType)

export const isMultipart = (mediaType = "") => /^multipart\/form-data\b/i.test(mediaType)

export const isFormMediaType = (mediaType?: string) =>
  isUrlEncoded(mediaType) || isMultipart(mediaType)

/** Bodies shown as text; anything else is binary. A missing type counts as text. */
export const isTextMediaType = (mediaType = "") =>
  mediaType === "" ||
  /^text\/|[/+](json|xml|yaml)\b|^application\/(javascript|ecmascript|x-www-form-urlencoded|graphql|x-ndjson)\b/i.test(
    mediaType,
  )

const isJsonWhitespace = (char?: string) =>
  char === " " || char === "\n" || char === "\r" || char === "\t"

/** Re-indents valid JSON text by adding whitespace only, so numbers and duplicate keys stay exactly as sent. */
const indentJson = (text: string) => {
  let out = ""
  let depth = 0
  const newline = () => `\n${"  ".repeat(depth)}`
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (char === '"') {
      const start = index
      for (index++; text[index] !== '"'; index++) if (text[index] === "\\") index++
      out += text.slice(start, index + 1)
    } else if (char === "{" || char === "[") {
      let next = index + 1
      while (isJsonWhitespace(text[next])) next++
      if (text[next] === (char === "{" ? "}" : "]")) {
        out += char + text[next]
        index = next
      } else {
        depth++
        out += char + newline()
      }
    } else if (char === "}" || char === "]") {
      depth--
      out += newline() + char
    } else if (char === ",") out += `,${newline()}`
    else if (char === ":") out += ": "
    else if (!isJsonWhitespace(char)) out += char
  }
  return out
}

/** Pretty-prints JSON bodies; anything else, or invalid JSON, is returned as is. */
export const formatResponseBody = (body: string, contentType?: string) => {
  if (!isJsonMediaType(contentType)) return body
  try {
    JSON.parse(body)
  } catch {
    return body
  }
  return indentJson(body)
}
