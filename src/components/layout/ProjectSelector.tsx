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
    <div className="relative flex flex-shrink-0 items-center">
      <Cloud
        className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-fg-subtle"
        aria-hidden
      />
      <select
        className="h-8 max-w-[10rem] truncate appearance-none rounded-md border border-border bg-surface pl-8 pr-6 text-caption text-fg transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer sm:max-w-[14rem]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23555' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 6px center",
          backgroundSize: "14px",
        }}
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