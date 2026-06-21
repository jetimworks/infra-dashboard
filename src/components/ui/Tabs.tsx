import { type ReactNode } from "react"
import { cn } from "../../lib/utils"
import type { LucideIcon } from "lucide-react"

export interface TabItem<T extends string> {
  value: T
  label: string
  icon?: LucideIcon
  badge?: ReactNode
}

export interface TabsProps<T extends string> {
  value: T
  onChange: (v: T) => void
  items: TabItem<T>[]
  className?: string
}

export function Tabs<T extends string>({
  value,
  onChange,
  items,
  className,
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex items-center gap-1 border-b border-border",
        className
      )}
    >
      {items.map((item) => {
        const Icon = item.icon
        const active = item.value === value
        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "relative inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors duration-150",
              "-mb-px border-b-2",
              active
                ? "border-primary text-primary"
                : "border-transparent text-fg-muted hover:text-fg"
            )}
          >
            {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
            {item.label}
            {item.badge ? (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-surface-sunken px-1.5 text-xs">
                {item.badge}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

Tabs.displayName = "Tabs"
