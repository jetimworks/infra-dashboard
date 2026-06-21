import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Cloud, Search, Server, ArrowRight } from "lucide-react"
import { useProjects } from "../queries/projects"
import { useInstances } from "../queries/instances"
import { Card } from "../components/ui/Card"
import { Input } from "../components/ui/Input"
import { LoadingPage } from "../components/ui/LoadingState"
import { EmptyState } from "../components/ui/EmptyState"
import { ErrorState } from "../components/ui/ErrorState"

export function ProjectsListPage() {
  const projectsQ = useProjects()
  const instancesQ = useInstances()
  const [search, setSearch] = useState("")

  const projects = useMemo(() => {
    const all = projectsQ.data ?? []
    const term = search.trim().toLowerCase()
    if (!term) return all
    return all.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.description ?? "").toLowerCase().includes(term)
    )
  }, [projectsQ.data, search])

  if (projectsQ.isLoading) return <LoadingPage label="Loading your projects…" />
  if (projectsQ.isError) {
    return (
      <ErrorState
        title="We couldn't load your projects"
        error={projectsQ.error as Error}
        onRetry={() => projectsQ.refetch()}
      />
    )
  }

  const allProjects = projectsQ.data ?? []
  const allInstances = instancesQ.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.75rem] font-bold leading-tight text-fg tracking-tight">
          Your projects
        </h1>
        <p className="mt-1 text-[0.9375rem] text-fg-muted">
          A project groups the servers, databases, and storage that belong
          together.
        </p>
      </div>

      {allProjects.length === 0 ? (
        <Card>
          <EmptyState
            icon={Cloud}
            title="No projects yet"
            description="When we set up your first server, database, or storage, we'll create a project for it. Until then, this is where it will show up."
          />
        </Card>
      ) : (
        <>
          <div className="max-w-md">
            <Input
              type="search"
              placeholder="Search projects by name"
              leftIcon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search projects"
            />
          </div>

          {projects.length === 0 ? (
            <Card>
              <p className="px-4 py-8 text-center text-sm text-fg-muted">
                No projects match "{search}".
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => {
                const projectInstances = allInstances.filter(
                  (i) => i.project_id === project.id
                )
                return (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="block"
                  >
                    <Card interactive padding="md">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                          <Cloud className="h-5 w-5" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-[1.0625rem] font-semibold text-fg">
                            {project.name}
                          </h3>
                          {project.description ? (
                            <p className="mt-0.5 truncate text-xs text-fg-muted">
                              {project.description}
                            </p>
                          ) : null}
                        </div>
                        <ArrowRight
                          className="h-4 w-4 shrink-0 text-fg-subtle"
                          aria-hidden
                        />
                      </div>
                      <div className="mt-4 flex items-center gap-2 text-xs text-fg-muted">
                        <Server className="h-3.5 w-3.5" aria-hidden />
                        <span>
                          {projectInstances.length}{" "}
                          {projectInstances.length === 1 ? "resource" : "resources"}
                        </span>
                      </div>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
