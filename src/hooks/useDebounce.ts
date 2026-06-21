import { useEffect, useState } from "react"

/**
 * Debounce a fast-changing value (e.g. search input) by `delay` ms.
 * Returns the most recent value after the user stops changing it.
 */
export function useDebounce<T>(value: T, delay = 200): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])

  return debounced
}
