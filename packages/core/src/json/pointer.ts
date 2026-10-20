import { isObject } from "./read"

/** Pointers are URI fragments, so `%` is encoded too: `unescapeSegment` percent-decodes. */
export const escapeSegment = (segment: string | number) =>
  String(segment).replaceAll("~", "~0").replaceAll("/", "~1").replaceAll("%", "%25")

const decode = (segment: string) => {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

export const unescapeSegment = (segment: string) =>
  decode(segment).replaceAll("~1", "/").replaceAll("~0", "~")

export const appendPointer = (pointer: string, ...segments: (string | number)[]) =>
  segments.reduce<string>((path, segment) => `${path}/${escapeSegment(segment)}`, pointer)

const parsePointer = (pointer: string) => {
  if (pointer === "#") return []
  return pointer.startsWith("#/") ? pointer.slice(2).split("/").map(unescapeSegment) : undefined
}

const child = (node: unknown, segment: string) => {
  if (Array.isArray(node)) return node[Number(segment)]
  return isObject(node) && Object.hasOwn(node, segment) ? node[segment] : undefined
}

export const getAtPointer = (root: unknown, pointer: string): unknown =>
  parsePointer(pointer)?.reduce<unknown>(child, root)
