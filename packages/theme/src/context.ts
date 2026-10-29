import { createContext, useContext } from "react"
import type { ResolvedLayout, TryItPreference } from "./layout"

export type ThemeSettings = ResolvedLayout & {
  /** What was asked for, before width fallbacks. */
  preference: { tryIt: TryItPreference }
  searchShortcut: boolean
}

const ThemeContext = createContext<ThemeSettings | undefined>(undefined)

export const ThemeProvider = ThemeContext.Provider

export const useTheme = () => {
  const settings = useContext(ThemeContext)
  if (!settings) throw new Error("Missing <ApiReference>")
  return settings
}
