import { type ReactNode } from "react"
import { type LucideIcon, TrendingDown, TrendingUp } from "lucide-react"
import { motion, type HTMLMotionProps } from "framer-motion"
import { cn } from "../../lib/utils"
import { Tooltip } from "../ui/Tooltip"
import { Skeleton } from "../ui/LoadingState"
import { listItem } from "../../lib/motion"

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

const statusDataAttr: Record<MetricStatus, string> = {
  ok: "ok",
  warning: "warning",
  danger: "danger",
  unknown: "neutral",
}

const statusText: Record<MetricStatus, string> = {
  ok: "text-fg",
  warning: "text-warning-fg",
  danger: "text-danger-fg",
  unknown: "text-fg-subtle",
}

const statusAccentText: Record<MetricStatus, string> = {
  ok: "text-primary",
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
          "rounded-lg bg-surface p-5 shadow-[var(--shadow-card)] border-b border-l border-border/40",
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
    <motion.div
      variants={listItem}
      data-metric-status={statusDataAttr[status]}
      className={cn(
        "rounded-lg bg-surface p-5 shadow-[var(--shadow-card)] border-b border-l border-border/40 transition-shadow duration-200",
        "hover:shadow-[var(--shadow-card-hover)]",
        className
      )}
      {...({} as HTMLMotionProps<"div">)}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        {help ? (
          <Tooltip content={help} side="top">
            <div className="flex items-center gap-1.5 text-[0.8125rem] text-fg-muted cursor-help">
              {Icon ? (
                <Icon
                  className={cn("h-4 w-4", statusAccentText[status])}
                  aria-hidden
                />
              ) : null}
              <span>{label}</span>
            </div>
          </Tooltip>
        ) : (
          <div className="flex items-center gap-1.5 text-[0.8125rem] text-fg-muted">
            {Icon ? (
              <Icon
                className={cn("h-4 w-4", statusAccentText[status])}
                aria-hidden
              />
            ) : null}
            <span>{label}</span>
          </div>
        )}
        {status !== "ok" && status !== "unknown" ? (
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              status === "warning" ? "bg-warning" : "bg-danger"
            )}
            aria-hidden
          />
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
    </motion.div>
  )
}

MetricTile.displayName = "MetricTile"

export function MetricTileSkeleton() {
  return <MetricTile label="Loading" value="—" loading />
}

// Re-export ReactNode so consumers can type children.
export type { ReactNode }
