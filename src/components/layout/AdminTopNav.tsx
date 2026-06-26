import { useLocation } from "react-router-dom"
import { useMemo } from "react"
import { Menu } from "lucide-react"
import { Breadcrumb, type BreadcrumbItem } from "./Breadcrumb"
import { UserMenu } from "./UserMenu"

export interface AdminTopNavProps {
  onOpenMobileSidebar?: () => void
}

export function AdminTopNav({ onOpenMobileSidebar }: AdminTopNavProps) {
  const location = useLocation()
  const items = useMemo<BreadcrumbItem[]>(
    () => deriveAdminBreadcrumbs(location.pathname),
    [location.pathname]
  )
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border/50 bg-surface/90 px-6 backdrop-blur-md md:px-10">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="rounded-md p-2 text-fg hover:bg-surface-sunken hover:text-fg ring-1 ring-border/40 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <Breadcrumb items={items} />
      </div>
      <div className="flex items-center gap-2">
        <UserMenu />
      </div>
    </header>
  )
}

AdminTopNav.displayName = "AdminTopNav"

const routeLabels: Record<string, string> = {
  admin: "Admin",
  users: "Users",
  projects: "Projects",
  instances: "Instances",
  "security-audits": "Security audits",
  "action-requests": "Action requests",
  activity: "Activity",
  new: "New",
  edit: "Edit",
  "ssh-key": "SSH key",
  "system-action": "System action",
  details: "Details",
}

function deriveAdminBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean)
  if (segments.length === 0) return [{ label: "Admin", to: "/admin" }]

  // First segment is always "admin"
  const items: BreadcrumbItem[] = [{ label: "Admin", to: "/admin" }]

  const rest = segments.slice(1) // remove "admin" prefix
  rest.forEach((seg, i) => {
    const to = "/admin/" + rest.slice(0, i + 1).join("/")
    const label =
      routeLabels[seg] ??
      (seg.match(/^[0-9a-f-]{8,}$/) ? "Details" : decodeURIComponent(seg))
    items.push({ label, to })
  })

  return items
}
