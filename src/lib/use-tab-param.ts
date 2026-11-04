import { useCallback } from "react"
import { useSearchParams } from "react-router-dom"

// Keeps the active tab in the `?tab=` query param so each tab change is a
// history entry and the browser Back button returns to the previous tab.
// Unknown or missing values fall back to `fallback`, and the fallback tab
// removes the param so its URL stays clean.
export function useTabParam<T extends string>(
  values: readonly T[],
  fallback: T
): [T, (next: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams()
  const raw = searchParams.get("tab")
  const tab = values.find((v) => v === raw) ?? fallback

  const setTab = useCallback(
    (next: T) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev)
        if (next === fallback) {
          params.delete("tab")
        } else {
          params.set("tab", next)
        }
        return params
      })
    },
    [setSearchParams, fallback]
  )

  return [tab, setTab]
}
