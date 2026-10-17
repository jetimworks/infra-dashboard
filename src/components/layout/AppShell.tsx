import { useEffect, useState } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { X } from "lucide-react"
import { Sidebar } from "./Sidebar"
import { TopNav } from "./TopNav"
import { ErrorBoundary } from "../feedback/ErrorBoundary"
import { ProjectProvider } from "../../contexts/ProjectContext"

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  // Auto-close the mobile drawer on navigation so users never have to
  // dismiss it manually after tapping a link. Uses the React-blessed
  // "previous-value" pattern from
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  // — track the previous pathname in state and reset drawer state inline
  // when it changes. State (unlike refs) is safe to read and write during
  // render in React 19.
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
    <ProjectProvider>
    <div className="min-h-screen bg-bg text-fg">
      <Sidebar />
      <div className="lg:pl-60">
        <TopNav onOpenMobileSidebar={() => setMobileOpen(true)} />
        <main className="px-4 py-6 sm:px-6 sm:py-8 md:px-10 md:py-10 max-w-screen-2xl">
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
          <div className="absolute inset-0 bg-fg/80 animate-fade-in" aria-hidden />
          <div
            className="absolute inset-y-0 left-0 w-80 max-w-[calc(100vw-1rem)] border-r border-border bg-white dark:bg-black shadow-[var(--shadow-modal)] animate-slide-in-left flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-3 top-3 rounded-md p-2 text-fg hover:bg-surface-sunken ring-1 ring-border/50 touch-target flex items-center justify-center"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
            <div onClick={() => setMobileOpen(false)} className="flex-1 overflow-y-auto">
              <Sidebar className="flex flex-col w-full h-full bg-white dark:bg-black" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
    </ProjectProvider>
  )
}

AppShell.displayName = "AppShell"
