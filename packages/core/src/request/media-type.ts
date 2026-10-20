export const isJsonMediaType = (mediaType = "") => /[/+]json\b/i.test(mediaType)

export const isUrlEncoded = (mediaType = "") =>
  /^application\/x-www-form-urlencoded\b/i.test(mediaType)

export const isMultipart = (mediaType = "") => /^multipart\/form-data\b/i.test(mediaType)

export const isFormMediaType = (mediaType?: string) =>
  isUrlEncoded(mediaType) || isMultipart(mediaType)

/** Pretty-prints JSON bodies; anything else, or invalid JSON, is returned as is. */
export const formatResponseBody = (body: string, contentType?: string) => {
  if (!isJsonMediaType(contentType)) return body
  try {
    return JSON.stringify(JSON.parse(body), null, 2)
  } catch {
    return body
  }
}
