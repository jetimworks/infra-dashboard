import { ConsoleShell } from "./ConsoleShell"
import { deriveBreadcrumbs } from "./breadcrumbs"
import { userNav } from "./console-nav"
import { ProjectProvider } from "../../contexts/ProjectContext"

/**
 * The customer console shell.
 *
 * ProjectProvider lives here (not in ConsoleShell) because the admin
 * console has no project scope — it needs the provider, this console does
 * not.
 */
export function AppShell() {
  return (
    <ProjectProvider>
      <ConsoleShell
        product="infra"
        nav={userNav}
        breadcrumbs={deriveBreadcrumbs}
        projectSelector
      />
    </ProjectProvider>
  )
}

AppShell.displayName = "AppShell"
