import { Cloud } from "lucide-react"
import { useEffect } from "react"
import { useProject } from "../../contexts/ProjectContext"
import { useProjects } from "../../queries/projects"

export function ProjectSelector() {
  const { selectedProjectId, setSelectedProjectId } = useProject()
  const { data: projects, isLoading } = useProjects()

  // Auto-select first project if none selected and projects are loaded
  useEffect(() => {
    if (projects && projects.length > 0 && selectedProjectId === null) {
      setSelectedProjectId(projects[0].id)
    }
  }, [projects, selectedProjectId, setSelectedProjectId])

  return (
    <div className="relative flex items-center">
      <Cloud className="pointer-events-none absolute left-2.5 h-4 w-4 text-fg-muted" aria-hidden />
      <select
        className="h-8 rounded-md border border-border/60 bg-surface pl-8 pr-6 text-sm text-fg focus:border-primary/70 focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 6px center", backgroundSize: "14px" }}
        value={selectedProjectId ?? ""}
        onChange={(e) => setSelectedProjectId(e.target.value || null)}
        disabled={isLoading}
        aria-label="Select project"
      >
        {isLoading ? (
          <option value="">Loading…</option>
        ) : projects && projects.length > 0 ? (
          <>
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </>
        ) : (
          <option value="">No projects</option>
        )}
      </select>
    </div>
  )
}