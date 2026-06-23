import { type ReactNode } from "react"
import { Download } from "lucide-react"
import { cn } from "../../lib/utils"
import { Button } from "../ui/Button"

export interface ChartContainerProps {
  title: string
  subtitle?: string
  isLoading?: boolean
  isEmpty?: boolean
  emptyMessage?: string
  onDownload?: () => void
  toolbar?: ReactNode
  children: ReactNode
  className?: string
}

export function ChartContainer({
  title,
  subtitle,
  isLoading,
  isEmpty,
  emptyMessage = "No data yet.",
  onDownload,
  toolbar,
  children,
  className,
}: ChartContainerProps) {
  return (
    <div
      className={cn(
        "rounded-lg bg-surface p-5 shadow-[var(--shadow-card)] border-b border-l border-border/40",
        className
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[1.0625rem] font-semibold text-fg">{title}</h3>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-fg-muted">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {toolbar}
          {onDownload ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
              leftIcon={Download}
            >
              CSV
            </Button>
          ) : null}
        </div>
      </div>
      <div className="h-56 w-full">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-fg-muted">
            Loading your metrics…
          </div>
        ) : isEmpty ? (
          <div className="flex h-full items-center justify-center text-sm text-fg-muted">
            {emptyMessage}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

ChartContainer.displayName = "ChartContainer"
