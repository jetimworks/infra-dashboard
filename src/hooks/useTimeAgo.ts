import { useEffect, useState } from "react"
import { formatDistanceToNowStrict, parseISO } from "date-fns"

/**
 * Returns a relative phrase ("5 minutes ago") that auto-refreshes every
 * `refreshMs` so the UI stays live without forcing a re-render on every tick.
 */
export function useTimeAgo(iso: string | null | undefined, refreshMs = 30_000): string {
  const [text, setText] = useState(() => compute(iso))

  // Keep text in sync when `iso` changes between intervals.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(compute(iso))
  }, [iso])

  // Tick every `refreshMs` to keep "x minutes ago" fresh.
  useEffect(() => {
    const t = setInterval(() => setText(compute(iso)), refreshMs)
    return () => clearInterval(t)
  }, [iso, refreshMs])

  return text
}

function compute(iso: string | null | undefined): string {
  if (!iso) return "—"
  try {
    return `${formatDistanceToNowStrict(parseISO(iso))} ago`
  } catch {
    return "—"
  }
}