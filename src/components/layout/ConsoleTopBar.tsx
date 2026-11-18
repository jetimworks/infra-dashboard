import { useEffect, useRef, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import {
  ChevronDown,
  Cloud,
  LifeBuoy,
  Lightbulb,
  Menu,
  Search,
  ShieldCheck,
} from "lucide-react"
import { useAuth } from "../../auth/useAuth"
import { useConsolePrefs } from "../../hooks/useConsolePrefs"
import { cn } from "../../lib/utils"
import { ThemeToggle } from "../theme/ThemeToggle"
import { UserMenu } from "./UserMenu"

export interface ConsoleTopBarProps {
  product: "infra" | "admin"
  onOpenMobileNav?: () => void
}

export function ConsoleTopBar({
  product,
  onOpenMobileNav,
}: ConsoleTopBarProps) {
  const { user } = useAuth()
  const location = useLocation()
  const { explain, toggleExplain, openPalette } = useConsolePrefs()
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const switcherRef = useRef<HTMLDivElement>(null)

  const isStaff = user?.is_staff ?? false
  const isAdmin = product === "admin"

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  useEffect(() => {
    if (!switcherOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSwitcherOpen(false)
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [switcherOpen])

  // Close the switcher on navigation.
  const [prevPathname, setPrevPathname] = useState(location.pathname)
  if (prevPathname !== location.pathname) {
    setPrevPathname(location.pathname)
    setSwitcherOpen(false)
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-3 border-b border-appbar-line bg-appbar px-3 text-appbar-fg sm:px-4">
      {/* Left — product switcher */}
      <div className="flex shrink-0 items-center gap-2" ref={switcherRef}>
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-appbar-muted transition-colors hover:bg-appbar-raised hover:text-appbar-fg lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>

        <button
          type="button"
          onClick={() => setSwitcherOpen((o) => !o)}
          className="flex h-9 items-center gap-2 rounded-md px-1.5 pr-2 transition-colors hover:bg-appbar-raised"
          aria-haspopup="menu"
          aria-expanded={switcherOpen}
        >
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md",
              isAdmin ? "bg-accent" : "bg-primary"
            )}
          >
            {isAdmin ? (
              <ShieldCheck className="h-4 w-4 text-fg-on-accent" aria-hidden />
            ) : (
              <Cloud className="h-4 w-4 text-fg-on-accent" aria-hidden />
            )}
          </span>
          <span className="hidden font-display text-sm font-semibold tracking-tight sm:inline">
            {isAdmin ? "Admin" : "Infra"}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-appbar-muted" aria-hidden />
        </button>

        {switcherOpen ? (
          <div
            role="menu"
            className="absolute left-3 top-[3.25rem] z-50 w-60 origin-top-left rounded-lg border border-border bg-surface p-1 shadow-[var(--shadow-popover)] animate-fade-in"
          >
            <p className="section-label px-3 py-2">Switch console</p>
            <Link
              to="/dashboard"
              role="menuitem"
              onClick={() => setSwitcherOpen(false)}
              className={cn(
                "flex items-start gap-3 rounded-md px-3 py-2 transition-colors hover:bg-surface-sunken",
                !isAdmin && "bg-surface-sunken"
              )}
            >
              <Cloud className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span>
                <span className="block text-sm font-medium text-fg">
                  Infra — your servers
                </span>
                <span className="block text-caption text-fg-muted">
                  The console you use to run your servers
                </span>
              </span>
            </Link>
            {isStaff ? (
              <Link
                to="/admin"
                role="menuitem"
                onClick={() => setSwitcherOpen(false)}
                className={cn(
                  "flex items-start gap-3 rounded-md px-3 py-2 transition-colors hover:bg-surface-sunken",
                  isAdmin && "bg-surface-sunken"
                )}
              >
                <ShieldCheck
                  className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                  aria-hidden
                />
                <span>
                  <span className="block text-sm font-medium text-fg">
                    Admin — platform
                  </span>
                  <span className="block text-caption text-fg-muted">
                    Manage customers, projects, and the platform
                  </span>
                </span>
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Centre — global search */}
      <div className="flex min-w-0 flex-1 justify-center">
        <button
          type="button"
          onClick={openPalette}
          className="flex h-9 w-full min-w-0 max-w-xl items-center gap-2 rounded-md border border-appbar-line bg-appbar-raised px-3 text-left text-sm text-appbar-muted transition-colors hover:border-appbar-muted"
        >
          <Search className="h-4 w-4 shrink-0" aria-hidden />
          <span className="hidden truncate sm:inline">
            Search projects, servers, and pages
          </span>
          <kbd className="ml-auto hidden shrink-0 rounded border border-appbar-line px-1.5 py-0.5 font-mono text-micro text-appbar-muted md:inline">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right — help, explain, theme, account */}
      <div className="flex shrink-0 items-center gap-1">
        <Link
          to="/support"
          className="hidden h-9 items-center gap-2 rounded-md px-2 text-sm text-appbar-muted transition-colors hover:bg-appbar-raised hover:text-appbar-fg sm:inline-flex"
        >
          <LifeBuoy className="h-4 w-4" aria-hidden />
          <span className="hidden md:inline">Help</span>
        </Link>

        <button
          type="button"
          onClick={toggleExplain}
          aria-pressed={explain}
          title={
            explain
              ? "Explain mode is on — showing plain-language notes"
              : "Turn on explain mode to see plain-language notes"
          }
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-md px-2 text-sm transition-colors",
            explain
              ? "bg-appbar-raised text-appbar-fg"
              : "text-appbar-muted hover:bg-appbar-raised hover:text-appbar-fg"
          )}
        >
          <Lightbulb className="h-4 w-4" aria-hidden />
          <span className="hidden md:inline">Explain</span>
        </button>

        <ThemeToggle variant="appbar" />

        <span className="mx-1 h-5 w-px bg-appbar-line" aria-hidden />

        <UserMenu variant="appbar" />
      </div>
    </header>
  )
}

ConsoleTopBar.displayName = "ConsoleTopBar"
