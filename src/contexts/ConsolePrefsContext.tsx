import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

/**
 * Console chrome preferences.
 *
 * Three small pieces of state that every console surface shares:
 *
 * - `navCollapsed` — the left nav rail collapses to a 64px icon rail. The
 *   rail width and the content offset both read this single value so they
 *   can never drift apart.
 * - `explain` — "Explain mode". When on, plain-language hints that are
 *   normally hover-only become visible. It exists because the audience is
 *   non-technical: the wording already exists (see METRIC_HELP in
 *   InstanceDetailPage and the metric catalogue in InstanceMetricsPage),
 *   it just needs to be surfaced.
 * - `paletteOpen` — the ⌘K command palette.
 *
 * All three persist to localStorage so the console feels like the same
 * place every time it is opened.
 *
 * The matching hook lives in `src/hooks/useConsolePrefs.ts` — React Fast
 * Refresh requires the context module to export only components.
 */

const NAV_COLLAPSED_KEY = "console_nav_collapsed"
const EXPLAIN_KEY = "console_explain"

export interface ConsolePrefsValue {
  navCollapsed: boolean
  toggleNavCollapsed: () => void
  explain: boolean
  toggleExplain: () => void
  paletteOpen: boolean
  openPalette: () => void
  closePalette: () => void
}

const ConsolePrefsContext = createContext<ConsolePrefsValue | undefined>(undefined)

function readBool(key: string): boolean {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(key) === "true"
}

export function ConsolePrefsProvider({ children }: { children: ReactNode }) {
  const [navCollapsed, setNavCollapsed] = useState(() =>
    readBool(NAV_COLLAPSED_KEY)
  )
  const [explain, setExplain] = useState(() => readBool(EXPLAIN_KEY))
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    window.localStorage.setItem(NAV_COLLAPSED_KEY, String(navCollapsed))
  }, [navCollapsed])

  useEffect(() => {
    window.localStorage.setItem(EXPLAIN_KEY, String(explain))
  }, [explain])

  const toggleNavCollapsed = useCallback(
    () => setNavCollapsed((was) => !was),
    []
  )
  const toggleExplain = useCallback(() => setExplain((was) => !was), [])
  const openPalette = useCallback(() => setPaletteOpen(true), [])
  const closePalette = useCallback(() => setPaletteOpen(false), [])

  const value = useMemo<ConsolePrefsValue>(
    () => ({
      navCollapsed,
      toggleNavCollapsed,
      explain,
      toggleExplain,
      paletteOpen,
      openPalette,
      closePalette,
    }),
    [
      navCollapsed,
      toggleNavCollapsed,
      explain,
      toggleExplain,
      paletteOpen,
      openPalette,
      closePalette,
    ]
  )

  return (
    <ConsolePrefsContext.Provider value={value}>
      {children}
    </ConsolePrefsContext.Provider>
  )
}

export { ConsolePrefsContext }
