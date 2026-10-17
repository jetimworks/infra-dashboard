import { useEffect, useRef, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { LogOut, User as UserIcon, ChevronDown } from "lucide-react"
import { useAuth } from "../../auth/useAuth"
import { initials } from "../../lib/utils"

export function UserMenu() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Close the dropdown when the user navigates so tapping a link
  // never leaves a stale popover hanging over the next page. Uses
  // the React-blessed "previous-value" pattern — track the previous
  // pathname in state and reset dropdown state inline when it
  // changes. State (unlike refs) is safe to read and write during
  // render in React 19.
  const [prevPathname, setPrevPathname] = useState(location.pathname)
  if (prevPathname !== location.pathname) {
    setPrevPathname(location.pathname)
    setOpen(false)
  }

  // Close on Escape for keyboard / a11y users.
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open])

  if (!user) return null

  const fullName = `${user.first_name} ${user.last_name}`.trim() || user.email
  const handleLogout = () => {
    setOpen(false)
    logout()
    navigate("/login", { replace: true })
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="touch-target flex items-center gap-2 rounded-full bg-surface/90 py-1 pl-1 pr-3 text-sm transition-colors hover:bg-surface-sunken"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-fg-on-accent">
          {initials(user.first_name || user.email, "?")}
        </span>
        <span className="hidden text-fg sm:inline">{user.first_name || "Account"}</span>
        <ChevronDown className="h-3.5 w-3.5 text-fg-muted" aria-hidden />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-56 origin-top-right rounded-lg bg-white dark:bg-black border border-border/60 shadow-[var(--shadow-modal)] animate-fade-in"
        >
          <div className="border-b border-border/50 px-4 py-3">
            <p className="text-sm font-medium text-fg">{fullName}</p>
            <p className="mt-0.5 truncate text-xs text-fg-muted">{user.email}</p>
          </div>
          <ul className="py-1">
            <li>
              <Link
                to="/account"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center gap-2 px-4 py-2 text-sm text-fg hover:bg-surface-sunken"
              >
                <UserIcon className="h-4 w-4 text-fg-muted" aria-hidden />
                Account settings
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={handleLogout}
                className="flex min-h-11 w-full items-center gap-2 px-4 py-2 text-left text-sm text-fg hover:bg-surface-sunken"
              >
                <LogOut className="h-4 w-4 text-fg-muted" aria-hidden />
                Sign out
              </button>
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  )
}

UserMenu.displayName = "UserMenu"
