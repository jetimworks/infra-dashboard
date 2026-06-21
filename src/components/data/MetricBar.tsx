import { cn } from "../../lib/utils"

export interface MetricBarProps {
  /** Numeric value 0..100 (or a fraction interpreted as percent). */
  value: number | null | undefined
  label?: string
  thresholds?: { warning: number; danger: number }
  invert?: boolean
  className?: string
}

/**
 * Horizontal bar that color-codes by threshold. For "lower is better" metrics
 * (CPU, RAM usage) invert=true swaps the color bands so low values stay green.
 */
export function MetricBar({
  value,
  label,
  thresholds = { warning: 60, danger: 80 },
  invert = false,
  className,
}: MetricBarProps) {
  const v = value == null ? null : Math.max(0, Math.min(100, value))

  let tone: "success" | "warning" | "danger" | "neutral" = "neutral"
  if (v != null) {
    const warnLevel = invert ? 100 - thresholds.warning : thresholds.warning
    const dangerLevel = invert ? 100 - thresholds.danger : thresholds.danger
    if (invert) {
      if (v <= dangerLevel) tone = "danger"
      else if (v <= warnLevel) tone = "warning"
      else tone = "success"
    } else {
      if (v >= dangerLevel) tone = "danger"
      else if (v >= warnLevel) tone = "warning"
      else tone = "success"
    }
  }

  const toneClasses = {
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    neutral: "bg-fg-subtle",
  }

  return (
    <div className={cn("w-full", className)}>
      {label ? (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-fg-muted">{label}</span>
          <span className="font-medium text-fg">
            {v == null ? "—" : `${v.toFixed(0)}%`}
          </span>
        </div>
      ) : null}
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
        <div
          className={cn("h-full rounded-full transition-all duration-300", toneClasses[tone])}
          style={{ width: v == null ? "0%" : `${v}%` }}
          aria-hidden
        />
      </div>
    </div>
  )
}

MetricBar.displayName = "MetricBar"
