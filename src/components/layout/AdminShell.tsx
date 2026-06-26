import { useState } from "react"
import { Outlet } from "react-router-dom"
import { X } from "lucide-react"
import { AdminSidebar } from "./AdminSidebar"
import { AdminTopNav } from "./AdminTopNav"
import { ErrorBoundary } from "../feedback/ErrorBoundary"

export function AdminShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  return (
    <div className="min-h-screen bg-bg text-fg">
      <AdminSidebar />
      <div className="lg:pl-60">
        <AdminTopNav onOpenMobileSidebar={() => setMobileOpen(true)} />
        <main className="px-6 py-8 md:px-10 md:py-10 max-w-screen-2xl">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div className="absolute inset-0 bg-fg/80" aria-hidden />
          <div
            className="absolute inset-y-0 left-0 w-80 border-r border-border bg-white dark:bg-black shadow-[var(--shadow-modal)] animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-3 top-3 rounded-md p-2 text-fg hover:bg-surface-sunken ring-1 ring-border/50"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
            <div onClick={() => setMobileOpen(false)}>
              <AdminSidebar className="flex flex-col w-full h-full bg-white dark:bg-black" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

AdminShell.displayName = "AdminShell"
