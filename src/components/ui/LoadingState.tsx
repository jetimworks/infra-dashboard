import { Loader2 } from "lucide-react"
import { cn } from "../../lib/utils"

export interface LoadingBlockProps {
  label?: string
  className?: string
}

export function LoadingBlock({ label, className }: LoadingBlockProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-fg-muted",
        className
      )}
    >
      <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
      {label ? (
        <p className="text-sm">{label}</p>
      ) : (
        <p className="sr-only">Loading</p>
      )}
    </div>
  )
}

LoadingBlock.displayName = "LoadingBlock"

export interface LoadingRowProps {
  className?: string
}

export function LoadingRow({ className }: LoadingRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 text-sm text-fg-muted",
        className
      )}
    >
      <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
      <span>Loading…</span>
    </div>
  )
}

LoadingRow.displayName = "LoadingRow"

export interface LoadingPageProps {
  label?: string
}

export function LoadingPage({ label = "Loading…" }: LoadingPageProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-fg-muted">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
        <p className="text-sm">{label}</p>
      </div>
    </div>
  )
}

LoadingPage.displayName = "LoadingPage"

export interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-surface-sunken",
        className
      )}
    />
  )
}

Skeleton.displayName = "Skeleton"
