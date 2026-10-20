import type { Credential } from "@spectile/core"
import type { CredentialStorage } from "./types"

const isCredential = (value: unknown): value is Credential =>
  typeof value === "string" ||
  (typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).username === "string" &&
    typeof (value as Record<string, unknown>).password === "string")

const parseCredentials = (text: string | null): Record<string, Credential> => {
  try {
    const parsed: unknown = JSON.parse(text ?? "{}")
    if (typeof parsed !== "object" || parsed === null) return {}
    return Object.fromEntries(Object.entries(parsed).filter(([, value]) => isCredential(value)))
  } catch {
    return {}
  }
}

/** Storage can throw, e.g. when the browser blocks it; credentials then stay in memory only. */
export const readCredentials = (storage: CredentialStorage, key: string) => {
  try {
    return parseCredentials(storage.getItem(key))
  } catch {
    return {}
  }
}

export const writeCredentials = (
  storage: CredentialStorage,
  key: string,
  credentials: Record<string, Credential>,
) => {
  try {
    storage.setItem(key, JSON.stringify(credentials))
  } catch {}
}
