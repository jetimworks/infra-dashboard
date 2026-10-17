import { Link } from "react-router-dom"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "../../lib/utils"

export interface BreadcrumbItem {
  label: string
  to: string
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
  /**
   * Opt in to a mobile-friendly fallback: when the path has more than
   * one segment, mobile screens (below `sm`) render a back chevron to
   * the previous segment and only the current page label. Larger
   * screens always render the full trail. Single-segment paths render
   * the full trail at every viewport.
   */
  compact?: boolean
}

export function Breadcrumb({ items, className, compact }: BreadcrumbProps) {
  if (items.length === 0) return null

  // Compact only applies when there is somewhere to go back to and the
  // caller opted in.
  const enableCompact = Boolean(compact) && items.length > 1
  const backHref = enableCompact ? items[items.length - 2] : null

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex min-w-0 items-center gap-1", className)}
    >
      {enableCompact && backHref ? (
        <Link
          to={backHref.to}
          aria-label={`Back to ${backHref.label}`}
          className="touch-target -ml-2 inline-flex flex-shrink-0 items-center justify-center rounded-md p-1.5 text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg sm:hidden"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </Link>
      ) : null}

      <ol className="flex min-w-0 items-center gap-1 text-sm">
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          // Below sm we collapse every segment except the last into a
          // back chevron above; the rest stays hidden.
          const hiddenOnMobile = enableCompact && !isLast
          return (
            <li
              key={item.to}
              className={cn(
                "flex min-w-0 items-center gap-1",
                hiddenOnMobile && "hidden sm:flex",
                isLast && "min-w-0 flex-1 truncate"
              )}
            >
              {isLast ? (
                <span
                  className={cn(
                    "truncate font-medium text-fg",
                    enableCompact ? "sm:font-medium" : ""
                  )}
                >
                  {item.label}
                </span>
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
                  className="h-3.5 w-3.5 flex-shrink-0 text-fg-subtle"
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
