export const isJsonMediaType = (mediaType = "") => /[/+]json\b/i.test(mediaType);

/** Pretty-prints JSON bodies; anything else, or invalid JSON, is returned as is. */
export const formatResponseBody = (body: string, contentType?: string) => {
  if (!isJsonMediaType(contentType)) return body;
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
};
