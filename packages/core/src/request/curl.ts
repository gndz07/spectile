import type { FormPart } from "./body"
import type { HttpRequest } from "./build"

const quote = (value: string) => `'${value.replaceAll("'", `'\\''`)}'`

/** curl's own quoting inside `-F` values, so `;` and `@` stay literal. */
const formQuote = (value: string) => `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`

const isContentType = (name: string) => name.toLowerCase() === "content-type"

/** Plain text uses `--form-string`, so curl never reads files for it; files are read from the working directory. */
const formArgument = ({ name, value, contentType }: FormPart) => {
  const type = contentType ? `;type=${contentType}` : ""
  if (typeof value !== "string") return `-F ${quote(`${name}=@${formQuote(value.name)}${type}`)}`
  return contentType
    ? `-F ${quote(`${name}=${formQuote(value)}${type}`)}`
    : `--form-string ${quote(`${name}=${value}`)}`
}

/** Multipart bodies are passed as form parts, so curl writes its own boundary. */
export const toCurl = ({ method, url, headers, body, form }: HttpRequest) =>
  [
    `curl -X ${method} ${quote(url)}`,
    ...Object.entries(headers)
      .filter(([name]) => !form || !isContentType(name))
      .map(([name, value]) => `-H ${quote(`${name}: ${value}`)}`),
    ...(form
      ? form.map(formArgument)
      : typeof body === "string"
        ? [`--data ${quote(body)}`]
        : []),
  ].join(" \\\n  ")
