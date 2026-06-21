import { NavLink, Outlet } from "react-router-dom"
import {
  Activity,
  Cloud,
  Database,
  LayoutDashboard,
  Server,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react"
import { Sidebar } from "./Sidebar"
import { TopNav } from "./TopNav"
import { ErrorBoundary } from "../feedback/ErrorBoundary"
import { cn } from "../../lib/utils"

const adminNavItems: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/projects", label: "Projects", icon: Cloud },
  { to: "/admin/instances", label: "Instances", icon: Server },
  { to: "/admin/security-audits", label: "Security audits", icon: ShieldCheck },
  { to: "/activity", label: "Activity", icon: Activity },
]

/**
 * Admin variant of AppShell. Reuses the regular Sidebar + TopNav (so the
 * brand and theme stay consistent) and overlays an admin sub-nav as a
 * horizontal strip just under the top nav.
 */
export function AdminLayout() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <Sidebar />
      <div className="lg:pl-60">
        <TopNav />
        <div className="border-b border-border bg-surface">
          <nav className="flex flex-wrap gap-1 px-6 py-2 md:px-10">
            {adminNavItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-accent-soft text-accent-soft-fg"
                        : "text-fg-muted hover:bg-surface-sunken hover:text-fg"
                    )
                  }
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {item.label}
                </NavLink>
              )
            })}
            <Database className="hidden" aria-hidden />
          </nav>
        </div>
        <main className="px-6 py-8 md:px-10 md:py-10 max-w-screen-2xl">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

AdminLayout.displayName = "AdminLayout"
