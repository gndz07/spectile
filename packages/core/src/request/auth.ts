import type { SecurityRequirement, SecurityScheme } from "../model"

/** A token or API key, or a username and password for HTTP Basic. */
export type Credential = string | { username: string; password: string }

export type AuthParts = { headers: [string, string][]; query: string[]; cookies: string[] }

const NONE: AuthParts = { headers: [], query: [], cookies: [] }

const secret = (credential: Credential) =>
  typeof credential === "string" ? credential : `${credential.username}:${credential.password}`

const base64 = (value: string) => btoa(String.fromCharCode(...new TextEncoder().encode(value)))

const isProvided = (credential: Credential | undefined) =>
  credential !== undefined && secret(credential) !== "" && secret(credential) !== ":"

const authorization = (value: string): AuthParts => ({
  ...NONE,
  headers: [["Authorization", value]],
})

const schemeParts = (scheme: SecurityScheme, credential: Credential): AuthParts => {
  const value = secret(credential)
  switch (scheme.type) {
    case "apiKey":
      if (scheme.in === "header") return { ...NONE, headers: [[scheme.paramName, value]] }
      if (scheme.in === "query") {
        return {
          ...NONE,
          query: [`${encodeURIComponent(scheme.paramName)}=${encodeURIComponent(value)}`],
        }
      }
      return { ...NONE, cookies: [`${scheme.paramName}=${encodeURIComponent(value)}`] }
    case "http":
      if (scheme.scheme.toLowerCase() === "basic") return authorization(`Basic ${base64(value)}`)
      return authorization(
        `${scheme.scheme.toLowerCase() === "bearer" ? "Bearer" : scheme.scheme} ${value}`,
      )
    case "oauth2":
    case "openIdConnect":
      return authorization(`Bearer ${value}`)
    case "mutualTLS":
      return NONE
  }
}

/** Applies the first security requirement that every needed credential is provided for. */
export const applySecurity = (
  schemes: SecurityScheme[],
  requirements: SecurityRequirement[],
  credentials: Record<string, Credential>,
): AuthParts => {
  const requirement = requirements.find(
    ({ schemes: required }) =>
      required.length > 0 && required.every(({ name }) => isProvided(credentials[name])),
  )
  return (requirement?.schemes ?? []).reduce<AuthParts>((parts, { name }) => {
    const scheme = schemes.find((candidate) => candidate.name === name)
    const credential = credentials[name]
    if (!scheme || credential === undefined) return parts
    const added = schemeParts(scheme, credential)
    return {
      headers: [...parts.headers, ...added.headers],
      query: [...parts.query, ...added.query],
      cookies: [...parts.cookies, ...added.cookies],
    }
  }, NONE)
}
