import { type ReactNode } from "react"
import { type LucideIcon, TrendingDown, TrendingUp } from "lucide-react"
import { cn } from "../../lib/utils"
import { Tooltip } from "../ui/Tooltip"
import { Skeleton } from "../ui/LoadingState"

export type MetricStatus = "ok" | "warning" | "danger" | "unknown"

export interface MetricTileProps {
  label: string
  value: string | number | null
  unit?: string
  hint?: string
  help?: string
  status?: MetricStatus
  loading?: boolean
  trend?: number
  invertTrend?: boolean
  icon?: LucideIcon
  className?: string
}

const statusBorder: Record<MetricStatus, string> = {
  ok: "border-border",
  warning: "border-warning-soft",
  danger: "border-danger-soft",
  unknown: "border-border-subtle",
}

const statusText: Record<MetricStatus, string> = {
  ok: "text-fg",
  warning: "text-warning-fg",
  danger: "text-danger-fg",
  unknown: "text-fg-subtle",
}

export function MetricTile({
  label,
  value,
  unit,
  hint,
  help,
  status = "ok",
  loading,
  trend,
  invertTrend,
  icon: Icon,
  className,
}: MetricTileProps) {
  if (loading) {
    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-card)]",
          className
        )}
      >
        <Skeleton className="mb-3 h-3 w-20" />
        <Skeleton className="h-7 w-28" />
      </div>
    )
  }

  const trendIsGood =
    trend != null ? (invertTrend ? trend < 0 : trend > 0) : null
  const TrendIcon =
    trend == null ? null : trend > 0 ? TrendingUp : TrendingDown

  return (
    <div
      className={cn(
        "rounded-lg border bg-surface p-5 shadow-[var(--shadow-card)]",
        statusBorder[status],
        className
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[0.8125rem] text-fg-muted">
          {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
          <span>{label}</span>
        </div>
        {help ? (
          <Tooltip content={help}>
            <button
              type="button"
              className="text-fg-subtle hover:text-fg-muted"
              aria-label={`About ${label}`}
            >
              <span className="text-xs underline decoration-dotted">what's this</span>
            </button>
          </Tooltip>
        ) : null}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={cn("text-[1.5rem] font-semibold", statusText[status])}>
          {value ?? "—"}
        </span>
        {unit ? (
          <span className="text-sm text-fg-subtle">{unit}</span>
        ) : null}
      </div>
      {(hint || trend != null) && (
        <div className="mt-2 flex items-center gap-2 text-xs text-fg-muted">
          {TrendIcon && trend != null ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium",
                trendIsGood ? "text-success-fg" : "text-danger-fg"
              )}
            >
              <TrendIcon className="h-3 w-3" aria-hidden />
              {Math.abs(trend).toFixed(0)}%
            </span>
          ) : null}
          {hint ? <span>{hint}</span> : null}
        </div>
      )}
    </div>
  )
}

MetricTile.displayName = "MetricTile"

export function MetricTileSkeleton() {
  return <MetricTile label="Loading" value="—" loading />
}

// Re-export ReactNode so consumers can type children.
export type { ReactNode }
