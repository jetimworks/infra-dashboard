import { Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"
import { cn } from "../../lib/utils"

export interface BreadcrumbItem {
  label: string
  to: string
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  if (items.length === 0) return null
  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol className="flex flex-wrap items-center gap-1 text-sm">
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <li key={item.to} className="flex items-center gap-1">
              {isLast ? (
                <span className="font-medium text-fg">{item.label}</span>
              ) : (
                <Link
                  to={item.to}
                  className="text-fg-muted transition-colors hover:text-fg"
                >
                  {item.label}
                </Link>
              )}
              {!isLast ? (
                <ChevronRight
                  className="h-3.5 w-3.5 text-fg-subtle"
                  aria-hidden
                />
              ) : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

Breadcrumb.displayName = "Breadcrumb"
