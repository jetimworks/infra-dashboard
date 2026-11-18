import {
  Activity,
  ClipboardList,
  Cloud,
  Gauge,
  Globe,
  LayoutDashboard,
  Server,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react"

/**
 * The console's navigation model.
 *
 * Two consoles share one shell: the customer console ("Infra") and the staff
 * console ("Admin"). Only the data below differs — the rendering lives in
 * ConsoleNav.tsx.
 */

export interface ConsoleNavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  /** Only rendered for staff accounts. */
  staffOnly?: boolean
}

export interface ConsoleNavGroup {
  /** Uppercase section label shown above the items. */
  label: string
  items: ConsoleNavItem[]
}

export const userNav: ConsoleNavGroup[] = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
      { to: "/activity", label: "Activity", icon: Activity, staffOnly: true },
    ],
  },
  {
    label: "Manage",
    items: [
      { to: "/instances", label: "Infrastructure", icon: Server },
      { to: "/deployments", label: "Deployments", icon: Globe },
      { to: "/action-requests", label: "Action requests", icon: ClipboardList },
    ],
  },
  {
    label: "Account",
    items: [
      { to: "/account", label: "Account", icon: Users },
      { to: "/support", label: "Support", icon: ShieldCheck },
    ],
  },
]

export const adminNav: ConsoleNavGroup[] = [
  {
    label: "Overview",
    items: [
      { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
      { to: "/admin/activity", label: "Activity", icon: Activity },
      { to: "/admin/platform", label: "Platform", icon: Gauge },
    ],
  },
  {
    label: "Manage",
    items: [
      { to: "/admin/users", label: "Users", icon: Users },
      { to: "/admin/projects", label: "Projects", icon: Cloud },
      { to: "/admin/instances", label: "Instances", icon: Server },
      { to: "/admin/action-requests", label: "Action requests", icon: ClipboardList },
    ],
  },
  {
    label: "Security",
    items: [
      { to: "/admin/security-audits", label: "Security audits", icon: ShieldCheck },
    ],
  },
]
