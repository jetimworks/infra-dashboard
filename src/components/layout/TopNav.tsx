import { useLocation } from "react-router-dom"
import { useMemo } from "react"
import { Menu } from "lucide-react"
import { Breadcrumb, type BreadcrumbItem } from "./Breadcrumb"
import { UserMenu } from "./UserMenu"
import { ProjectSelector } from "./ProjectSelector"

export interface TopNavProps {
  onOpenMobileSidebar?: () => void
}

export function TopNav({ onOpenMobileSidebar }: TopNavProps) {
  const location = useLocation()
  const items = useMemo<BreadcrumbItem[]>(
    () => deriveBreadcrumbs(location.pathname),
    [location.pathname]
  )
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-surface/90 px-6 backdrop-blur-md md:px-10">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="rounded-md p-2 text-fg-muted hover:bg-surface-sunken hover:text-fg lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <ProjectSelector />
        <Breadcrumb items={items} />
      </div>
      <div className="flex items-center gap-2">
        <UserMenu />
      </div>
    </header>
  )
}

TopNav.displayName = "TopNav"

const routeLabels: Record<string, string> = {
  dashboard: "Overview",
  projects: "Projects",
  instances: "Infrastructure",
  activity: "Activity",
  support: "Support",
  account: "Account",
  metrics: "Metrics",
  security: "Security",
  backups: "Backups",
  edit: "Edit",
  "ssh-key": "SSH key",
  "system-action": "System action",
  admin: "Admin",
  users: "Users",
  change: "Change",
  password: "Password",
  login: "Sign in",
  register: "Create account",
  "forgot-password": "Reset password",
  "new": "New",
}

function deriveBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean)
  if (segments.length === 0) return []
  return segments.map((seg, i) => {
    const to = "/" + segments.slice(0, i + 1).join("/")
    const label =
      routeLabels[seg] ??
      (seg.match(/^[0-9a-f-]{8,}$/) ? "Details" : decodeURIComponent(seg))
    return { label, to }
  })
}
