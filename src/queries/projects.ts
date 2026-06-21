import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { projectsApi } from "../api/projects"
import { normalizeError } from "../api/errors"
import { qk } from "../lib/query-keys"
import type { ProjectCreateInput, ProjectUpdateInput } from "../api/types"

export function useProjects(filters?: { userId?: string }) {
  return useQuery({
    queryKey: qk.projects(filters),
    queryFn: () => projectsApi.list({ user_id: filters?.userId }),
    staleTime: 60_000,
  })
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: id ? qk.project(id) : ["projects", "noop"],
    queryFn: () => projectsApi.get(id as string),
    enabled: Boolean(id),
    staleTime: 60_000,
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ProjectCreateInput) => projectsApi.create(body),
    onSuccess: (project) => {
      qc.invalidateQueries({ queryKey: ["projects"] })
      toast.success("Project created")
      return project
    },
    onError: (err) => {
      toast.error(normalizeError(err).message)
    },
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ProjectUpdateInput }) =>
      projectsApi.update(id, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["projects"] })
      qc.invalidateQueries({ queryKey: qk.project(vars.id) })
      toast.success("Project updated")
    },
    onError: (err) => {
      toast.error(normalizeError(err).message)
    },
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => projectsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] })
      qc.invalidateQueries({ queryKey: ["instances"] })
      toast.success("Project removed")
    },
    onError: (err) => {
      toast.error(normalizeError(err).message)
    },
  })
}
