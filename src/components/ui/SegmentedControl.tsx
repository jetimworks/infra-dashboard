import { cn } from "../../lib/utils"
import type { LucideIcon } from "lucide-react"

export interface SegmentedControlOption<T extends string> {
  value: T
  label: string
  icon?: LucideIcon
}

export interface SegmentedControlProps<T extends string> {
  value: T
  onChange: (v: T) => void
  options: SegmentedControlOption<T>[]
  className?: string
  ariaLabel?: string
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-surface-sunken/60 p-1",
        className
      )}
    >
      {options.map((opt) => {
        const Icon = opt.icon
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors duration-150",
              active
                ? "bg-surface text-primary shadow-[var(--shadow-card)] border border-border/40"
                : "text-fg-muted hover:text-fg"
            )}
          >
            {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

SegmentedControl.displayName = "SegmentedControl"
