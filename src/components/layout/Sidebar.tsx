import { NavLink, useLocation } from "react-router-dom"
import {
  Activity,
  ClipboardList,
  Cloud,
  HelpCircle,
  LayoutDashboard,
  LifeBuoy,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "../../lib/utils"
import { useAuth } from "../../auth/useAuth"
import { ThemeToggle } from "../theme/ThemeToggle"

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  staffOnly?: boolean
}

const navItems: NavItem[] = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/instances", label: "Infrastructure", icon: ShieldCheck },
  { to: "/action-requests", label: "Action Requests", icon: ClipboardList },
  { to: "/activity", label: "Activity", icon: Activity, staffOnly: true },
  { to: "/support", label: "Support", icon: LifeBuoy },
  { to: "/account", label: "Account", icon: Settings },
]

export function Sidebar({ className }: { className?: string }) {
  const { user } = useAuth()
  const location = useLocation()
  const isStaff = user?.is_staff ?? false

  return (
    <aside
      className={cn(
        "hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 lg:left-0",
        "border-r border-border/40 bg-surface",
        className
      )}
    >
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-fg-on-accent shadow-sm shadow-primary/20">
          <Cloud className="h-4 w-4" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold text-fg">Infra</p>
          <p className="text-[0.6875rem] text-fg-subtle">by Jetimworks</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems
            .filter((item) => !item.staffOnly || isStaff)
            .map((item) => {
              const Icon = item.icon
              const isActive = location.pathname.startsWith(item.to)
              return (
                <li key={item.to} className="relative">
                  {isActive ? (
                    <motion.span
                      layoutId="sidebar-rail"
                      className="nav-rail"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  ) : null}
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
                      isActive
                        ? "bg-primary-soft text-primary"
                        : "text-fg-muted hover:bg-surface-sunken hover:text-fg"
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {item.label}
                  </NavLink>
                </li>
              )
            })}
        </ul>
      </nav>

      <div className="border-t border-border/40 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <a
            href="mailto:support@jetimworks.com"
            className="flex items-center gap-2 text-xs text-fg-muted hover:text-fg"
          >
            <HelpCircle className="h-3.5 w-3.5" aria-hidden />
            Get help
          </a>
          <ThemeToggle />
        </div>
        <p className="mt-3 text-[0.6875rem] text-fg-subtle">
          Infra Dashboard · v0.1.0
        </p>
      </div>
    </aside>
  )
}

Sidebar.displayName = "Sidebar"
