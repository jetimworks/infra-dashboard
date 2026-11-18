import { useContext } from "react"
import { ConsolePrefsContext } from "../contexts/ConsolePrefsContext"

/**
 * Read the console chrome preferences (nav collapse, explain mode, palette
 * state). Lives in its own module so the context file only exports the
 * provider — React Fast Refresh requires that split.
 */
export function useConsolePrefs() {
  const context = useContext(ConsolePrefsContext)
  if (!context) {
    throw new Error("useConsolePrefs must be used inside a ConsolePrefsProvider")
  }
  return context
}
