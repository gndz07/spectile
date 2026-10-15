import type { HttpRequest } from "./build"

const quote = (value: string) => `'${value.replaceAll("'", `'\\''`)}'`

export const toCurl = ({ method, url, headers, body }: HttpRequest) =>
  [
    `curl -X ${method} ${quote(url)}`,
    ...Object.entries(headers).map(([name, value]) => `-H ${quote(`${name}: ${value}`)}`),
    ...(body === undefined ? [] : [`--data ${quote(body)}`]),
  ].join(" \\\n  ")
