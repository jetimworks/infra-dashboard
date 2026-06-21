import { AlertTriangle, RefreshCw } from "lucide-react"
import { cn } from "../../lib/utils"
import { Button } from "./Button"
import { EmptyState } from "./EmptyState"
import type { ApiError } from "../../api/errors"

export interface ErrorStateProps {
  title?: string
  description?: string
  error?: Error | ApiError | null
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = "We couldn't load this",
  description,
  error,
  onRetry,
  className,
}: ErrorStateProps) {
  const message = error?.message ?? description
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-12 rounded-lg border border-warning-soft bg-warning-soft/40",
        className
      )}
    >
      <div className="mb-4 rounded-full bg-warning-soft p-4">
        <AlertTriangle className="h-8 w-8 text-warning-fg" aria-hidden />
      </div>
      <h3 className="text-[1.25rem] font-semibold text-fg">{title}</h3>
      {message ? (
        <p className="mt-2 max-w-md text-[0.9375rem] text-fg-muted">{message}</p>
      ) : null}
      {onRetry ? (
        <div className="mt-6">
          <Button variant="outline" onClick={onRetry} leftIcon={RefreshCw}>
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  )
}

/**
 * Variant of EmptyState used when the underlying query failed. Kept as a
 * separate component so callers don't accidentally hide an empty response
 * behind an error state.
 */
ErrorState.displayName = "ErrorState"

// Re-export EmptyState for layout-level empty cases.
export { EmptyState }
