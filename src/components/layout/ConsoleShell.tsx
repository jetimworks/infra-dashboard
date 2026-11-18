import { useEffect, useMemo, useState } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { X } from "lucide-react"
import { ErrorBoundary } from "../feedback/ErrorBoundary"
import { useConsolePrefs } from "../../hooks/useConsolePrefs"
import { useInstances } from "../../queries/instances"
import { useProjects } from "../../queries/projects"
import { Breadcrumb, type BreadcrumbItem } from "./Breadcrumb"
import { CommandPalette } from "./CommandPalette"
import { ConsoleNav } from "./ConsoleNav"
import { ConsoleTopBar } from "./ConsoleTopBar"
import { ProjectSelector } from "./ProjectSelector"
import type { ConsoleNavGroup } from "./console-nav"

export interface ConsoleShellProps {
  product: "infra" | "admin"
  nav: ConsoleNavGroup[]
  breadcrumbs: (pathname: string) => BreadcrumbItem[]
  /** The customer console scopes resources by project; the admin one does not. */
  projectSelector?: boolean
}

/**
 * The console shell.
 *
 * Three chrome layers, top to bottom:
 *   1. the graphite app bar (fixed, full width) — identity, search, account
 *   2. the context bar — where you are, and which project you are looking at
 *   3. the nav rail — where you can go
 *
 * The app bar spans the full viewport width rather than stopping at the rail.
 * That single decision is what makes the app read as a console instead of a
 * dashboard with a header.
 */
export function ConsoleShell({
  product,
  nav,
  breadcrumbs,
  projectSelector,
}: ConsoleShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const { navCollapsed } = useConsolePrefs()

  const items = useMemo<BreadcrumbItem[]>(
    () => breadcrumbs(location.pathname),
    [breadcrumbs, location.pathname]
  )

  /*
    A UUID in the path means nothing to a person, so the breadcrumb would
    say "Details". The instances and projects are already loaded for the
    command palette, so the real name costs nothing to resolve.
  */
  const instancesQ = useInstances()
  const projectsQ = useProjects()
  const resolvedItems = useMemo<BreadcrumbItem[]>(
    () =>
      items.map((item) => {
        const segment = item.to.split("/").filter(Boolean).pop() ?? ""
        if (!/^[0-9a-f-]{8,}$/.test(segment)) return item
        const instance = instancesQ.data?.find((i) => i.id === segment)
        if (instance) return { ...item, label: instance.name }
        const project = projectsQ.data?.find((p) => p.id === segment)
        if (project) return { ...item, label: project.name }
        return item
      }),
    [items, instancesQ.data, projectsQ.data]
  )

  // Auto-close the mobile drawer on navigation so users never have to
  // dismiss it manually after tapping a link. Uses the React-blessed
  // "previous-value" pattern — track the previous pathname in state and
  // reset drawer state inline when it changes. State (unlike refs) is safe
  // to read and write during render in React 19.
  const [prevPathname, setPrevPathname] = useState(location.pathname)
  if (prevPathname !== location.pathname) {
    setPrevPathname(location.pathname)
    setMobileOpen(false)
  }

  // Lock body scroll while the drawer is open so the page underneath
  // doesn't shift on iOS Safari and the user can't accidentally
  // scroll both layers.
  useEffect(() => {
    if (!mobileOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [mobileOpen])

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!mobileOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false)
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [mobileOpen])

  return (
    <div className="min-h-screen bg-bg text-fg">
      <ConsoleTopBar
        product={product}
        onOpenMobileNav={() => setMobileOpen(true)}
      />

      {/* Nav rail — fixed, starting below the app bar */}
      <div className="fixed left-0 top-14 bottom-0 z-30 hidden lg:block">
        <ConsoleNav groups={nav} product={product} />
      </div>

      {/* Content column. pt-14 clears the fixed app bar; the context bar
          sits inside this column so it never runs under the nav rail. */}
      <div className={navCollapsed ? "pt-14 lg:pl-16" : "pt-14 lg:pl-60"}>
        <div className="sticky top-14 z-30 flex h-11 items-center gap-3 border-b border-border bg-surface px-3 sm:px-4 lg:px-6">
          {projectSelector ? <ProjectSelector /> : null}
          <Breadcrumb items={resolvedItems} compact />
        </div>

        <main className="px-4 py-5 sm:px-6 lg:px-8 lg:py-7 max-w-[1680px]">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-40 lg:hidden app-scroll-lock"
          onClick={() => setMobileOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Main navigation"
        >
          <div className="absolute inset-0 bg-fg/70 animate-fade-in" aria-hidden />
          <div
            className="absolute inset-y-0 left-0 w-72 max-w-[calc(100vw-1rem)] border-r border-border bg-surface shadow-[var(--shadow-modal)] animate-slide-in-left flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-2 top-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg touch-target"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
            <ConsoleNav
              groups={nav}
              product={product}
              onNavigate={() => setMobileOpen(false)}
              className="w-full"
            />
          </div>
        </div>
      ) : null}

      <CommandPalette />
    </div>
  )
}

ConsoleShell.displayName = "ConsoleShell"
