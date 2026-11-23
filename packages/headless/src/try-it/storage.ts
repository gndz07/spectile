import type { Credential, SpecModel } from "@spectile/core"
import { serverListKey } from "./servers"
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

/** With nothing left to keep, the entry is removed where the storage can. */
export const writeCredentials = (
  storage: CredentialStorage,
  key: string,
  credentials: Record<string, Credential>,
) => {
  try {
    if (Object.keys(credentials).length === 0 && storage.removeItem) storage.removeItem(key)
    else storage.setItem(key, JSON.stringify(credentials))
  } catch {}
}

const hashOf = (text: string) =>
  [...text]
    .reduce((hash, character) => (Math.imul(hash, 31) + character.charCodeAt(0)) >>> 0, 0)
    .toString(36)

/** The title alone would be shared by two versions or environments of one API; their servers tell them apart. */
export const defaultStorageKey = ({ info, servers }: SpecModel) =>
  `spectile:credentials:${info.title}:${hashOf(serverListKey(servers))}`
