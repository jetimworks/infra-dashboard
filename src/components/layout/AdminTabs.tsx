import { NavLink } from "react-router-dom"
import type { LucideIcon } from "lucide-react"
import { Activity, Cloud, LayoutDashboard, Server, ShieldCheck, Users } from "lucide-react"
import { cn } from "../../lib/utils"

interface AdminTab {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

const tabs: AdminTab[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/projects", label: "Projects", icon: Cloud },
  { to: "/admin/instances", label: "Instances", icon: Server },
  { to: "/admin/security-audits", label: "Security audits", icon: ShieldCheck },
  { to: "/activity", label: "Activity", icon: Activity },
]

/**
 * URL-driven tab strip rendered inside admin pages so admins can hop
 * between sections without bouncing through the overview. Mirrors the
 * visual treatment of the inline Tabs used elsewhere (e.g. InstanceDetailPage).
 */
export function AdminTabs() {
  return (
    <div
      role="tablist"
      aria-label="Admin sections"
      className="flex flex-wrap items-center gap-1 border-b border-border"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            role="tab"
            className={({ isActive }) =>
              cn(
                "relative inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors duration-150",
                "-mb-px border-b-2",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-fg-muted hover:text-fg"
              )
            }
          >
            <Icon className="h-4 w-4" aria-hidden />
            {tab.label}
          </NavLink>
        )
      })}
    </div>
  )
}

AdminTabs.displayName = "AdminTabs"
