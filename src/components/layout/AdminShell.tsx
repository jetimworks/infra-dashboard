import { ConsoleShell } from "./ConsoleShell"
import { deriveAdminBreadcrumbs } from "./breadcrumbs"
import { adminNav } from "./console-nav"

/**
 * The staff console shell — the same chrome as the customer console, with
 * the admin navigation model and the teal accent.
 */
export function AdminShell() {
  return (
    <ConsoleShell
      product="admin"
      nav={adminNav}
      breadcrumbs={deriveAdminBreadcrumbs}
    />
  )
}

AdminShell.displayName = "AdminShell"
