import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

interface ProjectContextType {
  selectedProjectId: string | null
  setSelectedProjectId: (id: string | null) => void
  clearSelectedProject: () => void
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

const STORAGE_KEY = "selected_project_id"

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [selectedProjectId, setSelectedProjectIdState] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY)
  })

  useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem(STORAGE_KEY, selectedProjectId)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [selectedProjectId])

  // React to logout in another tab
  useEffect(() => {
    const handler = () => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setSelectedProjectIdState(null)
      }
    }
    window.addEventListener("storage", handler)
    return () => window.removeEventListener("storage", handler)
  }, [])

  const setSelectedProjectId = (id: string | null) => {
    setSelectedProjectIdState(id)
  }

  const clearSelectedProject = () => {
    setSelectedProjectIdState(null)
  }

  return (
    <ProjectContext.Provider value={{ selectedProjectId, setSelectedProjectId, clearSelectedProject }}>
      {children}
    </ProjectContext.Provider>
  )
}

export { ProjectContext }

export function useProject() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error("useProject must be used inside ProjectProvider")
  return ctx
}