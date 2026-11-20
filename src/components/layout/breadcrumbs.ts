import type { BreadcrumbItem } from "./Breadcrumb"

/**
 * Breadcrumb labels are derived from the pathname rather than declared in a
 * route table, so a new route never shows a raw slug. UUID-shaped segments
 * collapse to "Details" because their IDs mean nothing to a person.
 */

const userRouteLabels: Record<string, string> = {
  dashboard: "Overview",
  projects: "Projects",
  instances: "Infrastructure",
  activity: "Activity",
  support: "Support",
  account: "Account",
  deployments: "Deployments",
  "action-requests": "Action requests",
  metrics: "Metrics",
  security: "Security",
  backups: "Backups",
  deploy: "Deploy",
  "app-control": "App control",
  "nginx-logs": "Web server logs",
  nginx: "Web server sites",
  files: "Files",
  schemas: "Database tables",
  system: "System",
  releases: "Releases",
  copilot: "Copilot",
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
  new: "New",
}

const adminRouteLabels: Record<string, string> = {
  admin: "Admin",
  users: "Users",
  projects: "Projects",
  instances: "Instances",
  "security-audits": "Security audits",
  "action-requests": "Action requests",
  activity: "Activity",
  platform: "Platform",
  new: "New",
  edit: "Edit",
  "ssh-key": "SSH key",
  "system-action": "System action",
  details: "Details",
}

function labelFor(segment: string, labels: Record<string, string>): string {
  return (
    labels[segment] ??
    (segment.match(/^[0-9a-f-]{8,}$/) ? "Details" : decodeURIComponent(segment))
  )
}

export function deriveBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean)
  if (segments.length === 0) return []
  return segments.map((segment, i) => ({
    label: labelFor(segment, userRouteLabels),
    to: "/" + segments.slice(0, i + 1).join("/"),
  }))
}

export function deriveAdminBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean)
  if (segments.length === 0) return [{ label: "Admin", to: "/admin" }]

  const items: BreadcrumbItem[] = [{ label: "Admin", to: "/admin" }]
  const rest = segments.slice(1)
  rest.forEach((segment, i) => {
    items.push({
      label: labelFor(segment, adminRouteLabels),
      to: "/admin/" + rest.slice(0, i + 1).join("/"),
    })
  })
  return items
}
