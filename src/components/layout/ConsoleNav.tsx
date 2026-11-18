import { NavLink, useLocation } from "react-router-dom"
import { HelpCircle, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { cn } from "../../lib/utils"
import { useAuth } from "../../auth/useAuth"
import { useConsolePrefs } from "../../hooks/useConsolePrefs"
import { Tooltip } from "../ui/Tooltip"
import type { ConsoleNavGroup } from "./console-nav"

export interface ConsoleNavProps {
  groups: ConsoleNavGroup[]
  /** "admin" swaps the accent from blue to teal. */
  product: "infra" | "admin"
  /** Called after a link is followed — used to close the mobile drawer. */
  onNavigate?: () => void
  className?: string
}

export function ConsoleNav({
  groups,
  product,
  onNavigate,
  className,
}: ConsoleNavProps) {
  const { user } = useAuth()
  const location = useLocation()
  const { navCollapsed, toggleNavCollapsed } = useConsolePrefs()
  const isStaff = user?.is_staff ?? false
  const isAdmin = product === "admin"

  return (
    <nav
      aria-label="Console navigation"
      className={cn(
        "flex h-full flex-col overflow-y-auto border-r border-border bg-surface",
        navCollapsed ? "w-16" : "w-60",
        className
      )}
    >
      <div className="flex-1 px-2 py-4">
        {groups.map((group) => {
          const items = group.items.filter(
            (item) => !item.staffOnly || isStaff
          )
          if (items.length === 0) return null
          return (
            <div key={group.label} className="mb-5 last:mb-0">
              <p className="section-label mb-1.5 px-3">
                {navCollapsed ? "" : group.label}
              </p>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon
                  const isActive = item.end
                    ? location.pathname === item.to
                    : location.pathname.startsWith(item.to)
                  const link = (
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={onNavigate}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "group flex h-9 items-center gap-3 rounded-md px-3 text-sm transition-colors duration-150",
                        navCollapsed && "justify-center px-0",
                        isActive
                          ? isAdmin
                            ? "bg-accent-soft font-semibold text-accent-soft-fg"
                            : "bg-primary-soft font-semibold text-primary-soft-fg"
                          : "text-fg-muted hover:bg-surface-sunken hover:text-fg"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      {navCollapsed ? (
                        <span className="sr-only">{item.label}</span>
                      ) : (
                        <span className="truncate">{item.label}</span>
                      )}
                    </NavLink>
                  )
                  return (
                    <li key={item.to}>
                      {navCollapsed ? (
                        <Tooltip content={item.label} side="right">
                          {link}
                        </Tooltip>
                      ) : (
                        link
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>

      <div className="border-t border-border px-2 py-3">
        <button
          type="button"
          onClick={toggleNavCollapsed}
          className={cn(
            "flex h-9 w-full items-center gap-3 rounded-md px-3 text-sm text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg",
            navCollapsed && "justify-center px-0"
          )}
          aria-label={navCollapsed ? "Expand navigation" : "Collapse navigation"}
          title={navCollapsed ? "Expand navigation" : "Collapse navigation"}
        >
          {navCollapsed ? (
            <PanelLeftOpen className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <PanelLeftClose className="h-4 w-4 shrink-0" aria-hidden />
          )}
          {navCollapsed ? null : <span>Collapse</span>}
        </button>

        {!navCollapsed ? (
          <>
            <a
              href="mailto:support@jetimworks.com"
              className="mt-1 flex h-9 items-center gap-3 rounded-md px-3 text-sm text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg"
            >
              <HelpCircle className="h-4 w-4 shrink-0" aria-hidden />
              Get help
            </a>
            <p className="px-3 pt-3 text-micro text-fg-subtle">
              Infra Dashboard · v0.1.0
            </p>
          </>
        ) : null}
      </div>
    </nav>
  )
}

ConsoleNav.displayName = "ConsoleNav"
