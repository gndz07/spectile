import { createContext, useContext } from "react"

export const createRequiredContext = <T>(providerName: string) => {
  const Context = createContext<T | undefined>(undefined)
  const useOptional = () => useContext(Context)
  const useRequired = () => {
    const value = useContext(Context)
    if (value === undefined) throw new Error(`Missing <${providerName}>`)
    return value
  }
  return [Context.Provider, useRequired, useOptional] as const
}
