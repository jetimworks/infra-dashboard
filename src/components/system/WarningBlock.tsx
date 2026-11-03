import { TriangleAlert } from "lucide-react"
import { cn } from "../../lib/utils"

/**
 * The backend's own warnings, shown as they were written.
 *
 * A warning on these endpoints usually means a config value was rejected and
 * a default was used instead — which means the operator is looking at a
 * different path than the one they asked for. Paraphrasing that would hide
 * the only part that matters, so the text is rendered verbatim.
 */

export interface WarningBlockProps {
  warnings: string[]
  title?: string
  className?: string
}

export function WarningBlock({
  warnings,
  title,
  className,
}: WarningBlockProps) {
  if (warnings.length === 0) return null

  return (
    <div
      className={cn(
        "rounded-md bg-warning-soft p-4 text-warning-fg ring-1 ring-inset ring-warning/25",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div className="min-w-0">
          {title ? (
            <p className="text-sm font-semibold">{title}</p>
          ) : null}
          <ul
            className={cn(
              "space-y-1 text-sm",
              title ? "mt-1" : undefined
            )}
          >
            {warnings.map((warning, index) => (
              <li key={index} className="break-words">
                {warning}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
