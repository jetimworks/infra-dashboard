import { type ReactNode } from "react"
import { useConsolePrefs } from "../../hooks/useConsolePrefs"
import { cn } from "../../lib/utils"

export interface ExplainHintProps {
  children: ReactNode
  className?: string
}

/**
 * A plain-language note that only appears while "Explain mode" is on.
 *
 * The product already carries the wording — every metric has a sentence
 * explaining what it means, and the quest copy explains why a thing
 * matters. What was missing was a way to surface it for people who do not
 * know what a metric is. Explain mode makes that wording visible instead
 * of hidden behind a hover.
 */
export function ExplainHint({ children, className }: ExplainHintProps) {
  const { explain } = useConsolePrefs()
  if (!explain) return null
  return (
    <p
      className={cn(
        "mt-1 text-caption leading-relaxed text-fg-muted",
        className
      )}
    >
      {children}
    </p>
  )
}

ExplainHint.displayName = "ExplainHint"
