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
    // On mobile, the tablist extends past the gutter (-mx-4 px-4) so
    // users can swipe the full-width overflow strip; the inner scroller
    // hides the scrollbar. On sm+ we drop back to a normal inline strip
    // that wraps naturally.
    <div
      className={cn(
        "-mx-4 -mb-px overflow-x-auto px-4 pb-px sm:mx-0 sm:mb-0 sm:overflow-visible sm:px-0 sm:pb-0",
        "scrollbar-hide [scrollbar-width:none]"
      )}
    >
      <div
        role="tablist"
        className={cn(
          "inline-flex min-w-full items-center gap-1 border-b border-border/40 sm:flex-wrap",
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
                "relative inline-flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-t-md px-4 py-2.5 text-sm font-medium transition-colors duration-150",
                "min-h-11 touch-target border-b-2 sm:min-h-0",
                active
                  ? "border-primary/70 text-primary"
                  : "border-transparent text-fg-muted hover:bg-surface-sunken hover:text-fg"
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
    </div>
  )
}

Tabs.displayName = "Tabs"
